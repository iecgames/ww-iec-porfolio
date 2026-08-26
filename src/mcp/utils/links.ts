/**
 * Build user-facing links for AI Agent responses.
 *
 * Every MCP tool that creates/updates a document should return:
 *   - `adminUrl`   — Payload admin edit screen (always works for HR)
 *   - `previewUrl` — Public-facing URL; if the doc is a draft, wraps it in
 *                    the `/next/preview` route so the user (logged into admin
 *                    in their browser) sees the unpublished version.
 *
 * NOTE: The preview route requires an authenticated admin session in the
 * user's browser — that's expected since AI returns the URL *to the user* who
 * is logged into admin.
 */

const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

const PREVIEW_SECRET = process.env.PREVIEW_SECRET ?? ''

type Locale = 'en' | 'vi'

type LinkArgs =
  | { collection: 'posts'; id: string | number; slug?: string | null; locale?: Locale; status?: string | null }
  | { collection: 'jobs'; id: string | number; locale?: Locale; status?: string | null }

export type DocLinks = {
  adminUrl: string
  previewUrl?: string
  status?: string
}

function publicPath(args: LinkArgs): string | null {
  if (args.collection === 'posts') {
    if (!args.slug) return null
    const locale = args.locale ?? 'en'
    return `/${locale}/posts/${encodeURIComponent(args.slug)}`
  }
  if (args.collection === 'jobs') {
    const locale = args.locale ?? 'en'
    return `/${locale}/career/${args.id}`
  }
  return null
}

export function buildLinks(args: LinkArgs): DocLinks {
  const adminUrl = `${SERVER_URL}/admin/collections/${args.collection}/${args.id}`

  const path = publicPath(args)
  const status = args.status ?? undefined
  if (!path) return { adminUrl, status }

  const isDraft = status !== 'published'
  const previewUrl = isDraft
    ? `${SERVER_URL}/next/preview?path=${encodeURIComponent(path)}&previewSecret=${encodeURIComponent(PREVIEW_SECRET)}`
    : `${SERVER_URL}${path}`

  return { adminUrl, previewUrl, status }
}

/** Render links as a readable block appended to MCP tool text responses. */
export function formatLinks(links: DocLinks): string {
  const lines: string[] = []
  if (links.status) lines.push(`Status: ${links.status}`)
  lines.push(`Admin: ${links.adminUrl}`)
  if (links.previewUrl) {
    const label = links.status === 'published' ? 'Public URL' : 'Preview URL (draft)'
    lines.push(`${label}: ${links.previewUrl}`)
  }
  return lines.join('\n')
}
