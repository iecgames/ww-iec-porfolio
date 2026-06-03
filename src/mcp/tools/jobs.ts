/**
 * MCP Tool definitions for the Jobs collection.
 *
 * WORKFLOW (enforced via tool descriptions + server-level `instructions`):
 *  1. `jobs_create` always creates a DRAFT in the requested locale.
 *  2. AI Agent immediately calls `jobs_update` with the same id and the OTHER
 *     locale to add the bilingual translation.
 *  3. AI Agent returns the preview URL to the user and ASKS for explicit
 *     confirmation before publishing.
 *  4. Only after the user confirms does the AI call `jobs_publish`.
 *
 * NOTE: McpServer.registerTool expects `inputSchema` as a plain object of Zod
 * schemas (ZodRawShapeCompat), not z.object(). Callback args are inferred.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Payload, Where } from 'payload'
import { z } from 'zod'

import { buildLinks, formatLinks } from '../utils/links'
import { textToLexical } from '../utils/lexical'

// ─── Shared schemas ───────────────────────────────────────────────────────────

const localeField = z.enum(['en', 'vi']).default('en').describe('Content locale (en | vi)')

const employmentTypeField = z
  .enum(['fullTime', 'partTime', 'contract', 'internship'])
  .optional()
  .describe('Employment type: fullTime | partTime | contract | internship')

const isFeaturedField = z
  .boolean()
  .optional()
  .describe('Featured flag — show this job in the CareersHighlight block on the home page')

const notifySubscribersField = z
  .boolean()
  .optional()
  .describe('Send a promotional email to all subscribers when first published (default true)')

const relatedJobsField = z
  .array(z.string())
  .max(3)
  .optional()
  .describe('Up to 3 related job IDs pinned at the bottom of this posting')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildJobData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  const strFields = [
    'title',
    'department',
    'location',
    'employmentType',
    'workingHours',
    'salaryLabel',
    'linkedinUrl',
    'description',
  ]
  for (const key of strFields) {
    if (input[key] !== undefined) data[key] = input[key]
  }

  // Non-localized scalar/relationship fields — pass through as-is when provided.
  const boolFields = ['isFeatured', 'notifySubscribers']
  for (const key of boolFields) {
    if (input[key] !== undefined) data[key] = input[key]
  }
  if (input['relatedJobs'] !== undefined) data['relatedJobs'] = input['relatedJobs']

  const jd = textToLexical(input['jobDescription'] as string | undefined)
  if (jd !== undefined) data['jobDescription'] = jd

  const qual = textToLexical(input['qualifications'] as string | undefined)
  if (qual !== undefined) data['qualifications'] = qual

  const ben = textToLexical(input['benefits'] as string | undefined)
  if (ben !== undefined) data['benefits'] = ben

  return data
}

function jobToText(doc: unknown): string {
  return JSON.stringify(doc, null, 2)
}

function statusOf(doc: unknown): string | undefined {
  const v = (doc as Record<string, unknown>)['_status']
  return typeof v === 'string' ? v : undefined
}

// ─── Tool registrations ───────────────────────────────────────────────────────

export function registerJobTools(server: McpServer, payload: Payload) {
  // ── jobs_list ──────────────────────────────────────────────────────────────
  server.registerTool(
    'jobs_list',
    {
      title: 'List Jobs',
      description:
        'List job postings with optional filters. Returns title, id, status (draft|published), and key metadata.',
      inputSchema: {
        locale: localeField,
        department: z.string().optional().describe('Filter by exact department name'),
        location: z.string().optional().describe('Filter by location (partial match)'),
        employmentType: employmentTypeField,
        isFeatured: z
          .boolean()
          .optional()
          .describe('Filter to only featured (true) or non-featured (false) jobs'),
        status: z
          .enum(['draft', 'published', 'any'])
          .default('any')
          .describe('Filter by publish status. Default "any" returns both drafts and published.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe('Max number of results to return'),
      },
    },
    async ({ locale, department, location, employmentType, isFeatured, status, limit }) => {
      const where: Where = {}
      if (department) where['department'] = { equals: department }
      if (location) where['location'] = { contains: location }
      if (employmentType) where['employmentType'] = { equals: employmentType }
      if (isFeatured !== undefined) where['isFeatured'] = { equals: isFeatured }
      if (status !== 'any') where['_status'] = { equals: status }

      const result = await payload.find({
        collection: 'jobs',
        where,
        limit,
        locale,
        depth: 0,
        draft: true, // include drafts in results
        overrideAccess: true,
      })

      const items = result.docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        department: doc.department,
        location: doc.location,
        employmentType: doc.employmentType,
        workingHours: doc.workingHours,
        salaryLabel: doc.salaryLabel,
        description: doc.description,
        isFeatured: doc.isFeatured,
        status: statusOf(doc),
        updatedAt: doc.updatedAt,
      }))

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ total: result.totalDocs, items }, null, 2),
          },
        ],
      }
    },
  )

  // ── jobs_get ───────────────────────────────────────────────────────────────
  server.registerTool(
    'jobs_get',
    {
      title: 'Get Job',
      description:
        'Get a single job posting by its ID, including all localized content fields. ' +
        'Returns admin URL and preview URL alongside the document.',
      inputSchema: {
        id: z.string().describe('Job document ID'),
        locale: localeField,
      },
    },
    async ({ id, locale }) => {
      const doc = await payload.findByID({
        collection: 'jobs',
        id,
        locale,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'jobs',
        id: doc.id,
        locale,
        status: statusOf(doc),
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `${jobToText(doc)}\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── jobs_create ────────────────────────────────────────────────────────────
  server.registerTool(
    'jobs_create',
    {
      title: 'Create Job (Draft)',
      description:
        'Create a new job posting as a DRAFT (not yet published). ' +
        'RichText fields (jobDescription, qualifications, benefits) accept plain text or simple ' +
        'markdown (## h2, ### h3, **bold**, --- for HR). Returns the new id, admin URL, and a ' +
        'draft preview URL.\n\n' +
        'NEXT STEPS the AI Agent MUST follow:\n' +
        '  1. Call `jobs_update` with the returned id and the OTHER locale to add the bilingual ' +
        'translation.\n' +
        '  2. Show the preview URL to the user and ASK whether to publish.\n' +
        '  3. Only call `jobs_publish` after explicit user confirmation.',
      inputSchema: {
        locale: localeField,
        title: z.string().describe('Job title'),
        department: z.string().describe('Department name (e.g. "Engineering", "Marketing")'),
        location: z.string().describe('Job location (e.g. "Hanoi, Vietnam" or "Remote")'),
        employmentType: employmentTypeField,
        workingHours: z.string().optional().describe('Working hours (e.g. "9AM – 6PM, Mon–Fri")'),
        salaryLabel: z
          .string()
          .optional()
          .describe('Salary label shown publicly (e.g. "Competitive" or "$80k–$120k")'),
        linkedinUrl: z
          .string()
          .optional()
          .describe('External job detail URL — link to the posting on an external site (e.g. LinkedIn)'),
        description: z
          .string()
          .optional()
          .describe('Short one-paragraph summary shown on the listing page'),
        jobDescription: z
          .string()
          .optional()
          .describe('Main job description body (plain text or simple markdown)'),
        qualifications: z
          .string()
          .optional()
          .describe('Candidate qualifications (plain text or simple markdown)'),
        benefits: z
          .string()
          .optional()
          .describe('Benefits offered (plain text or simple markdown)'),
        isFeatured: isFeaturedField,
        notifySubscribers: notifySubscribersField,
        relatedJobs: relatedJobsField,
      },
    },
    async (input) => {
      const { locale, ...rest } = input
      const data = buildJobData(rest as Record<string, unknown>)

      const doc = await payload.create({
        collection: 'jobs',
        data: { ...data, _status: 'draft' } as never,
        locale,
        draft: true,
      })

      const links = buildLinks({
        collection: 'jobs',
        id: doc.id,
        locale,
        status: 'draft',
      })

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Created DRAFT job "${doc.title}" (id: ${doc.id}, locale: ${locale})\n\n` +
              `${jobToText(doc)}\n\n${formatLinks(links)}\n\n` +
              `NEXT STEPS:\n` +
              `  1. Call jobs_update(id="${doc.id}", locale="${locale === 'en' ? 'vi' : 'en'}", ...) ` +
              `to add the ${locale === 'en' ? 'Vietnamese' : 'English'} translation.\n` +
              `  2. Show the preview URL above to the user and ASK whether to publish.\n` +
              `  3. Only call jobs_publish(id="${doc.id}") after explicit confirmation.`,
          },
        ],
      }
    },
  )

  // ── jobs_update ────────────────────────────────────────────────────────────
  server.registerTool(
    'jobs_update',
    {
      title: 'Update Job',
      description:
        'Update fields of an existing job. Only provided fields are changed. ' +
        'Specify locale to update content in that language without overwriting the other locale. ' +
        'Does NOT change publish status — use `jobs_publish` / `jobs_unpublish` for that. ' +
        'Returns the admin URL and preview URL for the user to review.',
      inputSchema: {
        id: z.string().describe('Job document ID to update'),
        locale: localeField,
        title: z.string().optional().describe('New job title'),
        department: z.string().optional().describe('New department'),
        location: z.string().optional().describe('New location'),
        employmentType: employmentTypeField,
        workingHours: z.string().optional().describe('New working hours'),
        salaryLabel: z.string().optional().describe('New salary label'),
        linkedinUrl: z
          .string()
          .optional()
          .describe('New external job detail URL (e.g. LinkedIn)'),
        description: z.string().optional().describe('New short summary'),
        jobDescription: z
          .string()
          .optional()
          .describe('New job description (plain text or markdown)'),
        qualifications: z
          .string()
          .optional()
          .describe('New qualifications (plain text or markdown)'),
        benefits: z.string().optional().describe('New benefits (plain text or markdown)'),
        isFeatured: isFeaturedField,
        notifySubscribers: notifySubscribersField,
        relatedJobs: relatedJobsField,
      },
    },
    async (input) => {
      const { id, locale, ...rest } = input
      const data = buildJobData(rest as Record<string, unknown>)

      // Use the current draft so we don't accidentally publish on update
      const current = await payload.findByID({
        collection: 'jobs',
        id,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })
      const currentStatus = statusOf(current) ?? 'draft'

      const doc = await payload.update({
        collection: 'jobs',
        id,
        data: { ...data, _status: currentStatus } as never,
        locale,
        draft: currentStatus === 'draft',
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'jobs',
        id: doc.id,
        locale,
        status: statusOf(doc),
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated job "${doc.title}" (id: ${doc.id})\n\n${jobToText(doc)}\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── jobs_publish ───────────────────────────────────────────────────────────
  server.registerTool(
    'jobs_publish',
    {
      title: 'Publish Job',
      description:
        'Publish a draft job posting so it becomes publicly visible. ' +
        'Call this ONLY after the user has reviewed the preview URL and explicitly ' +
        'confirmed they want to publish.',
      inputSchema: {
        id: z.string().describe('Job document ID to publish'),
      },
    },
    async ({ id }) => {
      const doc = await payload.update({
        collection: 'jobs',
        id,
        data: { _status: 'published' } as never,
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'jobs',
        id: doc.id,
        locale: 'en',
        status: 'published',
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Published job "${doc.title}" (id: ${doc.id})\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── jobs_unpublish ─────────────────────────────────────────────────────────
  server.registerTool(
    'jobs_unpublish',
    {
      title: 'Unpublish Job',
      description: 'Revert a published job back to draft status. The job becomes private again.',
      inputSchema: {
        id: z.string().describe('Job document ID to unpublish'),
      },
    },
    async ({ id }) => {
      const doc = await payload.update({
        collection: 'jobs',
        id,
        data: { _status: 'draft' } as never,
        draft: true,
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'jobs',
        id: doc.id,
        locale: 'en',
        status: 'draft',
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Unpublished job "${doc.title}" (id: ${doc.id})\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── jobs_delete ────────────────────────────────────────────────────────────
  server.registerTool(
    'jobs_delete',
    {
      title: 'Delete Job',
      description:
        'Permanently delete a job posting by ID. This is destructive — the AI Agent should ' +
        'confirm with the user before calling.',
      inputSchema: {
        id: z.string().describe('Job document ID to delete'),
      },
    },
    async ({ id }) => {
      await payload.delete({ collection: 'jobs', id })

      return {
        content: [{ type: 'text' as const, text: `Deleted job id: ${id}` }],
      }
    },
  )
}
