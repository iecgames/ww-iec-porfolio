import type { Page, Post } from '@/payload-types'

type LinkLike = {
  type?: 'reference' | 'route' | 'section' | 'custom' | null
  reference?: {
    relationTo: 'pages' | 'posts'
    value: string | number | Page | Post
  } | null
  route?: string | null
  section?: string | null
  url?: string | null
} | null

/**
 * Resolve a shared `link` field group into an href + whether it points off-site.
 *
 * The single source of truth for that mapping: CMSLink calls this too, rather
 * than keeping its own copy — the two used to diverge on what an unrecognised
 * `type` should do.
 */
export function resolveLinkHref(link?: LinkLike): { href: string; external: boolean } | null {
  if (!link) return null

  if (link.type === 'section' && link.section) {
    return { href: link.section, external: false }
  }
  if (link.type === 'route' && link.route) {
    return { href: link.route, external: false }
  }
  if (link.type === 'custom' && link.url) {
    return { href: link.url, external: /^https?:\/\//i.test(link.url) }
  }
  if (link.type === 'reference' && link.reference && typeof link.reference.value === 'object') {
    const { relationTo, value } = link.reference
    if (value?.slug) {
      return { href: `${relationTo === 'posts' ? '/posts' : ''}/${value.slug}`, external: false }
    }
  }

  // Documents saved before `type` existed — or carrying an unrecognised value —
  // still hold a plain url. CMSLink always fell back to it, so keep that or
  // their links would vanish from the rendered page.
  if (link.url) {
    return { href: link.url, external: /^https?:\/\//i.test(link.url) }
  }

  return null
}
