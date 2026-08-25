import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './[slug]/page.client'
import LandingClient from './landing.client'

type Args = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { locale } = await paramsPromise
  const url = '/'

  const home = await queryHomeGlobal(locale, draft)

  if (!home) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = home

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      <LandingClient />
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}
      {hero && <RenderHero {...hero} />}
      {Array.isArray(layout) && <RenderBlocks blocks={layout} />}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale } = await paramsPromise
  const home = await queryHomeGlobal(locale, false)
  // Re-use the page meta helper; map hero richText -> meta where useful.
  return generateMeta({ doc: home as any, locale: locale as 'en' | 'vi' })
}

const queryHomeUncached = async (locale: string, draft: boolean) => {
  const payload = await getPayload({ config: configPromise })

  const home = await payload.findGlobal({
    slug: 'home',
    depth: 2,
    draft,
    overrideAccess: draft,
    locale: locale as 'en' | 'vi',
  })

  return home || null
}

/**
 * Published content only. Tagged `global_home`, which revalidateHome already
 * fires on save. Draft content must never reach this cache — an editor's
 * unpublished draft is theirs alone, and a cached copy would leak it to
 * everyone and go stale on the next edit.
 */
const queryHomeCached = (locale: string) =>
  unstable_cache(async () => queryHomeUncached(locale, false), ['home-global', locale], {
    tags: ['global_home'],
  })

const queryHomeGlobal = cache(async (locale: string, draft: boolean) =>
  draft ? queryHomeUncached(locale, true) : queryHomeCached(locale)(),
)
