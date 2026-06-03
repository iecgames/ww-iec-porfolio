/**
 * MCP Tool definitions for the Posts (blog) collection.
 *
 * WORKFLOW (mirrors jobs):
 *  1. `posts_create` always creates a DRAFT.
 *  2. AI Agent shows the preview URL and ASKS the user before publishing.
 *  3. Only after explicit confirmation does the AI call `posts_publish`.
 *
 * Posts are BILINGUAL (en | vi): title, content, and SEO meta are localized.
 * Each tool takes a `locale` so the AI can read/write one language without
 * overwriting the other. Categories and tags (not localized) can be resolved
 * by name (case-insensitive) or by ID.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Payload, Where } from 'payload'
import { z } from 'zod'

import { buildLinks, formatLinks } from '../utils/links'
import { textToLexical } from '../utils/lexical'

// ─── Shared schemas ───────────────────────────────────────────────────────────

const localeField = z.enum(['en', 'vi']).default('en').describe('Content locale (en | vi)')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusOf(doc: unknown): string | undefined {
  const v = (doc as Record<string, unknown>)['_status']
  return typeof v === 'string' ? v : undefined
}

function postToText(doc: unknown): string {
  // Trim noisy fields for AI context — full doc is in admin
  const d = doc as Record<string, unknown>
  const summary = {
    id: d['id'],
    title: d['title'],
    slug: d['slug'],
    status: d['_status'],
    publishedAt: d['publishedAt'],
    categories: d['categories'],
    tags: d['tags'],
    updatedAt: d['updatedAt'],
  }
  return JSON.stringify(summary, null, 2)
}

/**
 * Resolve a list of category/tag references to Payload IDs.
 * Each entry can be either an existing ID (number/string) or a name (string).
 */
async function resolveRefs(
  payload: Payload,
  collection: 'categories' | 'tags',
  values: Array<string | number> | undefined,
): Promise<Array<string | number> | undefined> {
  if (!values || values.length === 0) return undefined
  const resolved: Array<string | number> = []
  for (const v of values) {
    // Numeric or numeric-string → treat as ID
    if (typeof v === 'number' || /^\d+$/.test(String(v))) {
      resolved.push(v)
      continue
    }
    // Try ID match first (covers MongoDB ObjectIDs which are 24-hex)
    if (typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)) {
      resolved.push(v)
      continue
    }
    // Name lookup (case-insensitive)
    const found = await payload.find({
      collection,
      where: { title: { equals: v } },
      limit: 1,
      depth: 0,
    })
    if (found.docs.length > 0) {
      resolved.push(found.docs[0]!.id)
    } else {
      throw new Error(`No ${collection} found with name "${v}". Create it first or use an ID.`)
    }
  }
  return resolved
}

async function buildPostData(
  payload: Payload,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {}

  if (input['title'] !== undefined) data['title'] = input['title']

  const content = textToLexical(input['content'] as string | undefined)
  if (content !== undefined) data['content'] = content

  const cats = await resolveRefs(payload, 'categories', input['categories'] as Array<string | number> | undefined)
  if (cats !== undefined) data['categories'] = cats

  const tags = await resolveRefs(payload, 'tags', input['tags'] as Array<string | number> | undefined)
  if (tags !== undefined) data['tags'] = tags

  if (input['heroImage'] !== undefined) data['heroImage'] = input['heroImage']

  // SEO metadata (optional). title/description are localized; image is shared.
  const meta: Record<string, unknown> = {}
  if (input['metaTitle'] !== undefined) meta['title'] = input['metaTitle']
  if (input['metaDescription'] !== undefined) meta['description'] = input['metaDescription']
  if (input['metaImage'] !== undefined) meta['image'] = input['metaImage']
  if (Object.keys(meta).length > 0) data['meta'] = meta

  // Non-localized flag — pass through when provided.
  if (input['notifySubscribers'] !== undefined) data['notifySubscribers'] = input['notifySubscribers']

  return data
}

// ─── Tool registrations ───────────────────────────────────────────────────────

export function registerPostTools(server: McpServer, payload: Payload) {
  // ── posts_list ─────────────────────────────────────────────────────────────
  server.registerTool(
    'posts_list',
    {
      title: 'List Posts',
      description:
        'List blog posts with optional filters. Returns id, title, slug, status, and metadata. ' +
        'Use this to find a post id before calling posts_get / posts_update.',
      inputSchema: {
        locale: localeField,
        search: z.string().optional().describe('Case-insensitive substring search across titles'),
        status: z
          .enum(['draft', 'published', 'any'])
          .default('any')
          .describe('Filter by publish status. Default "any" returns drafts + published.'),
        category: z.string().optional().describe('Filter by category name or ID'),
        tag: z.string().optional().describe('Filter by tag name or ID'),
        limit: z.number().int().min(1).max(100).default(20).describe('Max results'),
      },
    },
    async ({ locale, search, status, category, tag, limit }) => {
      const where: Where = {}
      if (search) where['title'] = { like: search }
      if (status !== 'any') where['_status'] = { equals: status }

      if (category) {
        const [resolved] = (await resolveRefs(payload, 'categories', [category])) ?? []
        if (resolved !== undefined) where['categories'] = { in: [resolved] }
      }
      if (tag) {
        const [resolved] = (await resolveRefs(payload, 'tags', [tag])) ?? []
        if (resolved !== undefined) where['tags'] = { in: [resolved] }
      }

      const result = await payload.find({
        collection: 'posts',
        where,
        limit,
        locale,
        depth: 1,
        draft: true,
        overrideAccess: true,
      })

      const items = result.docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        status: statusOf(doc),
        publishedAt: doc.publishedAt,
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

  // ── posts_get ──────────────────────────────────────────────────────────────
  server.registerTool(
    'posts_get',
    {
      title: 'Get Post',
      description:
        'Get a single blog post by ID, including full content. Returns admin URL and preview URL.',
      inputSchema: {
        id: z.string().describe('Post document ID'),
        locale: localeField,
      },
    },
    async ({ id, locale }) => {
      const doc = await payload.findByID({
        collection: 'posts',
        id,
        locale,
        depth: 1,
        draft: true,
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'posts',
        id: doc.id,
        slug: doc.slug,
        locale,
        status: statusOf(doc),
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `${JSON.stringify(doc, null, 2)}\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── posts_create ───────────────────────────────────────────────────────────
  server.registerTool(
    'posts_create',
    {
      title: 'Create Post (Draft)',
      description:
        'Create a new blog post as a DRAFT in the requested locale. The slug is auto-generated ' +
        'from the title. Pass `content` as plain text or simple markdown (## h2, ### h3, **bold**, ' +
        '--- HR). Categories/tags can be passed as names (looked up) or IDs. Returns the new id, ' +
        'admin URL, and a draft preview URL.\n\n' +
        'NEXT STEPS the AI Agent MUST follow:\n' +
        '  1. Call `posts_update` with the returned id and the OTHER locale to add the bilingual ' +
        'translation (title + content).\n' +
        '  2. Show the preview URL to the user and ASK whether to publish.\n' +
        '  3. Only call `posts_publish` after explicit user confirmation.',
      inputSchema: {
        locale: localeField,
        title: z.string().describe('Post title (slug auto-generated from this)'),
        content: z
          .string()
          .describe('Post body as plain text or simple markdown — will be converted to Lexical'),
        categories: z
          .array(z.string())
          .optional()
          .describe('List of category names or IDs to attach (not localized)'),
        tags: z.array(z.string()).optional().describe('List of tag names or IDs to attach (not localized)'),
        heroImage: z.string().optional().describe('Media document ID to use as the hero image'),
        metaTitle: z.string().optional().describe('SEO meta title (defaults to post title)'),
        metaDescription: z.string().optional().describe('SEO meta description'),
        metaImage: z
          .string()
          .optional()
          .describe(
            'Media document ID for the SEO/social-share image (meta.image). Use media_list or media_upload to get one.',
          ),
        notifySubscribers: z
          .boolean()
          .optional()
          .describe('Send a promotional email to all subscribers when first published (default true)'),
      },
    },
    async (input) => {
      const { locale, ...rest } = input as { locale: 'en' | 'vi' } & Record<string, unknown>
      const data = await buildPostData(payload, rest)

      const doc = await payload.create({
        collection: 'posts',
        data: { ...data, _status: 'draft' } as never,
        locale,
        draft: true,
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'posts',
        id: doc.id,
        slug: doc.slug,
        locale,
        status: 'draft',
      })

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Created DRAFT post "${doc.title}" (id: ${doc.id}, locale: ${locale})\n\n` +
              `${postToText(doc)}\n\n${formatLinks(links)}\n\n` +
              `NEXT STEPS:\n` +
              `  1. Call posts_update(id="${doc.id}", locale="${locale === 'en' ? 'vi' : 'en'}", ...) ` +
              `to add the ${locale === 'en' ? 'Vietnamese' : 'English'} translation.\n` +
              `  2. Show the preview URL above to the user and ASK whether to publish.\n` +
              `  3. Only call posts_publish(id="${doc.id}") after explicit confirmation.`,
          },
        ],
      }
    },
  )

  // ── posts_update ───────────────────────────────────────────────────────────
  server.registerTool(
    'posts_update',
    {
      title: 'Update Post',
      description:
        'Update fields of an existing post. Only provided fields are changed. Specify locale to ' +
        'update content in that language without overwriting the other locale. Does NOT change ' +
        'publish status — use `posts_publish` / `posts_unpublish` for that. ' +
        'Returns the admin URL and preview URL.',
      inputSchema: {
        id: z.string().describe('Post document ID to update'),
        locale: localeField,
        title: z.string().optional().describe('New title'),
        content: z.string().optional().describe('New body (plain text or markdown)'),
        categories: z.array(z.string()).optional().describe('Replace categories (names or IDs)'),
        tags: z.array(z.string()).optional().describe('Replace tags (names or IDs)'),
        heroImage: z.string().optional().describe('Replace hero image (Media document ID)'),
        metaTitle: z.string().optional().describe('New SEO meta title'),
        metaDescription: z.string().optional().describe('New SEO meta description'),
        metaImage: z
          .string()
          .optional()
          .describe('Replace the SEO/social-share image (meta.image) — a Media document ID'),
        notifySubscribers: z
          .boolean()
          .optional()
          .describe('Send a promotional email to all subscribers when first published (default true)'),
      },
    },
    async (input) => {
      const { id, locale, ...rest } = input as { id: string; locale: 'en' | 'vi' } & Record<
        string,
        unknown
      >
      const data = await buildPostData(payload, rest)

      const current = await payload.findByID({
        collection: 'posts',
        id,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })
      const currentStatus = statusOf(current) ?? 'draft'

      const doc = await payload.update({
        collection: 'posts',
        id,
        data: { ...data, _status: currentStatus } as never,
        locale,
        draft: currentStatus === 'draft',
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'posts',
        id: doc.id,
        slug: doc.slug,
        locale,
        status: statusOf(doc),
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated post "${doc.title}" (id: ${doc.id})\n\n${postToText(doc)}\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── posts_publish ──────────────────────────────────────────────────────────
  server.registerTool(
    'posts_publish',
    {
      title: 'Publish Post',
      description:
        'Publish a draft post so it becomes publicly visible. Call ONLY after the user has ' +
        'reviewed the preview URL and explicitly confirmed they want to publish.',
      inputSchema: {
        id: z.string().describe('Post document ID to publish'),
      },
    },
    async ({ id }) => {
      const doc = await payload.update({
        collection: 'posts',
        id,
        data: { _status: 'published' } as never,
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'posts',
        id: doc.id,
        slug: doc.slug,
        status: 'published',
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Published post "${doc.title}" (id: ${doc.id})\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── posts_unpublish ────────────────────────────────────────────────────────
  server.registerTool(
    'posts_unpublish',
    {
      title: 'Unpublish Post',
      description: 'Revert a published post back to draft status. The post becomes private again.',
      inputSchema: {
        id: z.string().describe('Post document ID to unpublish'),
      },
    },
    async ({ id }) => {
      const doc = await payload.update({
        collection: 'posts',
        id,
        data: { _status: 'draft' } as never,
        draft: true,
        overrideAccess: true,
      })

      const links = buildLinks({
        collection: 'posts',
        id: doc.id,
        slug: doc.slug,
        status: 'draft',
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Unpublished post "${doc.title}" (id: ${doc.id})\n\n${formatLinks(links)}`,
          },
        ],
      }
    },
  )

  // ── posts_delete ───────────────────────────────────────────────────────────
  server.registerTool(
    'posts_delete',
    {
      title: 'Delete Post',
      description:
        'Permanently delete a post by ID. This is destructive — the AI Agent should confirm ' +
        'with the user before calling.',
      inputSchema: {
        id: z.string().describe('Post document ID to delete'),
      },
    },
    async ({ id }) => {
      await payload.delete({ collection: 'posts', id })

      return {
        content: [{ type: 'text' as const, text: `Deleted post id: ${id}` }],
      }
    },
  )
}
