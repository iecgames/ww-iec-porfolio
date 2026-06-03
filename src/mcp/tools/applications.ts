/**
 * MCP Tool definitions for the JobApplications collection (HR side).
 *
 * Designed for HR workflows: list/get candidates, summarise the funnel,
 * update statuses, and add internal notes. These tools are READ-MOSTLY —
 * the only mutations allowed are status changes and internal notes.
 *
 * Candidates submit their CV via the public /career form; the AI Agent never
 * creates applications.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Payload, Where } from 'payload'
import { z } from 'zod'

import { buildLinks, formatLinks } from '../utils/links'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['new', 'reviewing', 'contacted', 'rejected', 'hired'] as const
const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cvUrlOf(doc: Record<string, unknown>): string | undefined {
  const cv = doc['cv'] as Record<string, unknown> | string | number | undefined
  if (!cv || typeof cv !== 'object') return undefined
  const filename = cv['filename'] as string | undefined
  const url = cv['url'] as string | undefined
  if (url) return url.startsWith('http') ? url : `${SERVER_URL}${url}`
  if (filename) return `${SERVER_URL}/media/${encodeURIComponent(filename)}`
  return undefined
}

function summarize(doc: Record<string, unknown>) {
  return {
    id: doc['id'],
    fullName: doc['fullName'],
    email: doc['email'],
    phone: doc['phone'],
    position: doc['position'],
    job:
      typeof doc['job'] === 'object' && doc['job']
        ? { id: (doc['job'] as Record<string, unknown>)['id'], title: (doc['job'] as Record<string, unknown>)['title'] }
        : doc['job'],
    status: doc['status'],
    submittedAt: doc['submittedAt'],
    additionalLink: doc['additionalLink'],
    cvUrl: cvUrlOf(doc),
  }
}

// ─── Tool registrations ───────────────────────────────────────────────────────

export function registerApplicationTools(server: McpServer, payload: Payload) {
  // ── applications_list ─────────────────────────────────────────────────────
  server.registerTool(
    'applications_list',
    {
      title: 'List Job Applications',
      description:
        'List candidate CV submissions with optional filters. Returns a slim summary per ' +
        'candidate including the CV download URL — perfect for a quick HR overview.',
      inputSchema: {
        status: z
          .enum([...STATUSES, 'any'])
          .default('any')
          .describe('Filter by application status'),
        jobId: z
          .string()
          .optional()
          .describe('Filter to applications for a specific job ID (empty job = general/open application)'),
        position: z
          .string()
          .optional()
          .describe('Filter by position the candidate is interested in (case-insensitive substring)'),
        search: z
          .string()
          .optional()
          .describe('Search across fullName, email, phone (case-insensitive)'),
        submittedAfter: z
          .string()
          .optional()
          .describe('ISO date (YYYY-MM-DD) — only applications submitted on/after this date'),
        submittedBefore: z
          .string()
          .optional()
          .describe('ISO date (YYYY-MM-DD) — only applications submitted on/before this date'),
        limit: z.number().int().min(1).max(100).default(20).describe('Max results'),
        sort: z
          .enum(['newest', 'oldest', 'name'])
          .default('newest')
          .describe('Result ordering'),
      },
    },
    async ({ status, jobId, position, search, submittedAfter, submittedBefore, limit, sort }) => {
      const where: Where = {}
      if (status !== 'any') where['status'] = { equals: status }
      if (jobId) where['job'] = { equals: jobId }
      if (position) where['position'] = { like: position }
      if (search) {
        where['or'] = [
          { fullName: { like: search } },
          { email: { like: search } },
          { phone: { like: search } },
        ]
      }
      if (submittedAfter || submittedBefore) {
        const range: Record<string, string> = {}
        if (submittedAfter) range['greater_than_equal'] = submittedAfter
        if (submittedBefore) range['less_than_equal'] = submittedBefore
        where['submittedAt'] = range
      }

      const sortKey =
        sort === 'newest' ? '-submittedAt' : sort === 'oldest' ? 'submittedAt' : 'fullName'

      const result = await payload.find({
        collection: 'job-applications',
        where,
        limit,
        sort: sortKey,
        depth: 1,
        overrideAccess: true,
      })

      const items = result.docs.map((d) => summarize(d as unknown as Record<string, unknown>))

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

  // ── applications_get ──────────────────────────────────────────────────────
  server.registerTool(
    'applications_get',
    {
      title: 'Get Job Application',
      description:
        'Get full details of a single application by ID, including experience summary, additional ' +
        'link (portfolio/GitHub/etc.), internal notes, CV download link, and admin URL.',
      inputSchema: {
        id: z.string().describe('Application document ID'),
      },
    },
    async ({ id }) => {
      const doc = (await payload.findByID({
        collection: 'job-applications',
        id,
        depth: 1,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>

      const links = buildLinks({ collection: 'job-applications', id: doc['id'] as string })
      const cvUrl = cvUrlOf(doc)

      const detail = {
        ...summarize(doc),
        experience: doc['experience'],
        internalNotes: doc['internalNotes'],
      }

      const extras: string[] = [formatLinks(links)]
      if (cvUrl) extras.push(`CV download: ${cvUrl}`)

      return {
        content: [
          {
            type: 'text' as const,
            text: `${JSON.stringify(detail, null, 2)}\n\n${extras.join('\n')}`,
          },
        ],
      }
    },
  )

  // ── applications_summary ──────────────────────────────────────────────────
  server.registerTool(
    'applications_summary',
    {
      title: 'Summarize Applications',
      description:
        'Aggregate application stats for HR reporting. Returns total count and breakdowns by ' +
        'status, by position, and by recent activity (last 7 days). Optionally narrow to a ' +
        'specific job or date range.',
      inputSchema: {
        jobId: z.string().optional().describe('Limit summary to a specific job ID'),
        submittedAfter: z
          .string()
          .optional()
          .describe('ISO date — only applications submitted on/after this date'),
        submittedBefore: z
          .string()
          .optional()
          .describe('ISO date — only applications submitted on/before this date'),
      },
    },
    async ({ jobId, submittedAfter, submittedBefore }) => {
      const where: Where = {}
      if (jobId) where['job'] = { equals: jobId }
      if (submittedAfter || submittedBefore) {
        const range: Record<string, string> = {}
        if (submittedAfter) range['greater_than_equal'] = submittedAfter
        if (submittedBefore) range['less_than_equal'] = submittedBefore
        where['submittedAt'] = range
      }

      const all = await payload.find({
        collection: 'job-applications',
        where,
        limit: 0, // 0 = no limit, return totalDocs accurately
        depth: 0,
        overrideAccess: true,
        pagination: false,
      })

      const docs = all.docs as unknown as Array<Record<string, unknown>>

      const byStatus: Record<string, number> = {}
      for (const s of STATUSES) byStatus[s] = 0
      const byPosition: Record<string, number> = {}

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      let last7Days = 0

      for (const d of docs) {
        const status = String(d['status'] ?? 'new')
        byStatus[status] = (byStatus[status] ?? 0) + 1

        const pos = String(d['position'] ?? 'Unknown')
        byPosition[pos] = (byPosition[pos] ?? 0) + 1

        const submittedAt = d['submittedAt'] ? new Date(d['submittedAt'] as string).getTime() : 0
        if (submittedAt >= sevenDaysAgo) last7Days++
      }

      const summary = {
        total: docs.length,
        last7Days,
        byStatus,
        byPosition: Object.entries(byPosition)
          .sort((a, b) => b[1] - a[1])
          .reduce<Record<string, number>>((acc, [k, v]) => {
            acc[k] = v
            return acc
          }, {}),
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
      }
    },
  )

  // ── applications_update_status ────────────────────────────────────────────
  server.registerTool(
    'applications_update_status',
    {
      title: 'Update Application Status',
      description:
        'Update a candidate\'s pipeline status (new → reviewing → contacted → rejected/hired). ' +
        'Optionally append an internal HR note in the same call.',
      inputSchema: {
        id: z.string().describe('Application document ID'),
        status: z.enum(STATUSES).describe('New status to set'),
        note: z
          .string()
          .optional()
          .describe('Optional internal HR note to APPEND to existing notes'),
      },
    },
    async ({ id, status, note }) => {
      const data: Record<string, unknown> = { status }

      if (note) {
        const current = (await payload.findByID({
          collection: 'job-applications',
          id,
          depth: 0,
          overrideAccess: true,
        })) as unknown as Record<string, unknown>
        const existing = (current['internalNotes'] as string | undefined) ?? ''
        const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
        data['internalNotes'] = existing
          ? `${existing}\n\n[${stamp}] ${note}`
          : `[${stamp}] ${note}`
      }

      const doc = (await payload.update({
        collection: 'job-applications',
        id,
        data: data as never,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>

      const links = buildLinks({ collection: 'job-applications', id: doc['id'] as string })

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Updated application "${doc['fullName']}" → status: ${doc['status']}\n\n` +
              `${JSON.stringify(summarize(doc), null, 2)}\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )
}
