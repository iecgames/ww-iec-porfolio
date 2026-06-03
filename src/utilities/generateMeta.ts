import type { Metadata } from 'next'

import type { Media, Page, Post } from '../payload-types'

import { buildSEO } from './getDefaultSEO'
import { getServerSideURL } from './getURL'

type Locale = 'en' | 'vi'

const toAbsolute = (url?: string | null): string | undefined => {
  if (!url) return undefined
  return url.startsWith('http') ? url : getServerSideURL() + url
}

/** Resolves a doc's `meta.image` to an absolute OG image URL (prefers the `og` size). */
const getImageURL = (image?: Media | number | string | null): string | undefined => {
  if (image && typeof image === 'object' && 'url' in image) {
    const media = image as Media
    return toAbsolute(media.sizes?.og?.url ?? media.url)
  }
  return undefined
}

/**
 * Builds page/post metadata on top of the site-wide defaults from General Settings.
 * The doc's own SEO fields take priority; anything missing (notably the OG image)
 * falls back to the General defaults — companyName, description and the site logo.
 */
export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  locale?: Locale
}): Promise<Metadata> => {
  const { doc, locale = 'en' } = args

  const ogImage = getImageURL(doc?.meta?.image)

  return buildSEO(locale, {
    title: doc?.meta?.title || undefined,
    description: doc?.meta?.description || undefined,
    // No doc image → buildSEO falls back to the site logo from General Settings.
    images: ogImage ? [{ url: ogImage }] : undefined,
  })
}
