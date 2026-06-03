/**
 * MCP Tool definitions for the Media (uploads) collection.
 *
 * Media documents are the images referenced by `heroImage` and SEO `meta.image`
 * on posts (and jobs). The AI can:
 *   • `media_list`   — find existing media to reuse an ID
 *   • `media_get`    — inspect a single media document
 *   • `media_upload` — create a NEW media document from a remote URL or a file
 *                      already on the server disk
 *
 * Media is NOT localized (alt/caption are shared across locales). Binary upload
 * over MCP is avoided: images come in by URL (fetched server-side) or by an
 * absolute server file path — never as base64 in the tool arguments.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Payload, Where } from 'payload'
import { z } from 'zod'

import { textToLexical } from '../utils/lexical'

const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map a MIME type to a sensible file extension when the URL lacks one. */
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
}

/** Build admin + public links for a media document. `url` may be relative. */
function mediaLinks(id: string | number, url?: string | null): string {
  const adminUrl = `${SERVER_URL}/admin/collections/media/${id}`
  const lines = [`Admin: ${adminUrl}`]
  if (url) {
    const publicUrl = url.startsWith('http') ? url : `${SERVER_URL}${url}`
    lines.push(`File URL: ${publicUrl}`)
  }
  return lines.join('\n')
}

/** Trim a media doc down to the fields useful for AI context. */
function mediaToSummary(doc: unknown): Record<string, unknown> {
  const d = doc as Record<string, unknown>
  return {
    id: d['id'],
    alt: d['alt'],
    filename: d['filename'],
    mimeType: d['mimeType'],
    width: d['width'],
    height: d['height'],
    filesize: d['filesize'],
    url: d['url'],
    updatedAt: d['updatedAt'],
  }
}

/** Derive a filename (with extension) from a URL and/or content-type. */
function deriveFilename(url: string, mimeType: string | null): string {
  let base = ''
  try {
    const pathname = new URL(url).pathname
    base = decodeURIComponent(pathname.split('/').pop() ?? '')
  } catch {
    base = ''
  }
  // Strip any query-ish leftovers and whitespace
  base = base.split('?')[0]!.trim()

  const hasExt = /\.[a-z0-9]{2,5}$/i.test(base)
  if (base && hasExt) return base

  const ext = mimeType ? (MIME_EXT[mimeType.split(';')[0]!.trim().toLowerCase()] ?? 'jpg') : 'jpg'
  const stem = base || `upload-${url.length}`
  return `${stem}.${ext}`
}

// ─── Tool registrations ───────────────────────────────────────────────────────

export function registerMediaTools(server: McpServer, payload: Payload) {
  // ── media_list ───────────────────────────────────────────────────────────
  server.registerTool(
    'media_list',
    {
      title: 'List Media',
      description:
        'List media (images) in the library. Returns id, alt, filename, mimeType, dimensions, and ' +
        'url. Use this to find an existing image ID to attach as a post heroImage or SEO meta.image. ' +
        'If nothing matches, use media_upload to add a new image.',
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe('Case-insensitive substring match across filename and alt text'),
        limit: z.number().int().min(1).max(100).default(20).describe('Max results'),
      },
    },
    async ({ search, limit }) => {
      const where: Where = {}
      if (search) {
        where['or'] = [{ filename: { like: search } }, { alt: { like: search } }]
      }

      const result = await payload.find({
        collection: 'media',
        where,
        limit,
        depth: 0,
        overrideAccess: true,
      })

      const items = result.docs.map(mediaToSummary)

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

  // ── media_get ──────────────────────────────────────────────────────────────
  server.registerTool(
    'media_get',
    {
      title: 'Get Media',
      description: 'Get a single media document by ID, including its file URL and image dimensions.',
      inputSchema: {
        id: z.string().describe('Media document ID'),
      },
    },
    async ({ id }) => {
      const doc = await payload.findByID({
        collection: 'media',
        id,
        depth: 0,
        overrideAccess: true,
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `${JSON.stringify(mediaToSummary(doc), null, 2)}\n\n${mediaLinks(doc.id, (doc as { url?: string }).url)}`,
          },
        ],
      }
    },
  )

  // ── media_upload ─────────────────────────────────────────────────────────
  server.registerTool(
    'media_upload',
    {
      title: 'Upload Media',
      description:
        'Create a NEW media document from an image. Provide EITHER `url` (a remote image URL fetched ' +
        'server-side) OR `filePath` (an absolute path to an image already on the server disk) — not ' +
        'both. Always pass a descriptive `alt` for accessibility and SEO. Returns the new media id and ' +
        'file URL; use that id as a post heroImage or SEO metaImage.',
      inputSchema: {
        url: z
          .string()
          .url()
          .optional()
          .describe('Remote image URL to download and store (e.g. https://.../photo.jpg)'),
        filePath: z
          .string()
          .optional()
          .describe('Absolute path to an image file on the server disk (alternative to url)'),
        alt: z.string().optional().describe('Alt text describing the image (recommended)'),
        caption: z
          .string()
          .optional()
          .describe('Optional caption as plain text or simple markdown'),
      },
    },
    async ({ url, filePath, alt, caption }) => {
      if (!url && !filePath) {
        throw new Error('Provide either `url` or `filePath`.')
      }
      if (url && filePath) {
        throw new Error('Provide only ONE of `url` or `filePath`, not both.')
      }

      const data: Record<string, unknown> = {}
      if (alt !== undefined) data['alt'] = alt
      const captionLexical = textToLexical(caption)
      if (captionLexical !== undefined) data['caption'] = captionLexical

      let doc
      if (url) {
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(`Failed to fetch image from URL (HTTP ${res.status} ${res.statusText}).`)
        }
        const mimeType = res.headers.get('content-type')
        if (mimeType && !mimeType.toLowerCase().startsWith('image/')) {
          throw new Error(`URL did not return an image (content-type: ${mimeType}).`)
        }
        const buffer = Buffer.from(await res.arrayBuffer())
        const name = deriveFilename(url, mimeType)

        doc = await payload.create({
          collection: 'media',
          data: data as never,
          file: {
            data: buffer,
            mimetype: mimeType ?? 'application/octet-stream',
            name,
            size: buffer.length,
          },
          overrideAccess: true,
        })
      } else {
        doc = await payload.create({
          collection: 'media',
          data: data as never,
          filePath: filePath!,
          overrideAccess: true,
        })
      }

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Uploaded media (id: ${doc.id})\n\n` +
              `${JSON.stringify(mediaToSummary(doc), null, 2)}\n\n` +
              `${mediaLinks(doc.id, (doc as { url?: string }).url)}\n\n` +
              `Use this id as a post heroImage or SEO metaImage.`,
          },
        ],
      }
    },
  )
}
