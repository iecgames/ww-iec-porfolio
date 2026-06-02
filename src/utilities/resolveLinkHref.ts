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
 * Mirrors the branching in CMSLink, for places that render their own markup
 * (e.g. the Video Hero buttons) instead of using CMSLink.
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
  return null
}
