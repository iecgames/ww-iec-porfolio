import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
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

  let home
  try {
    home = await queryHomeGlobal(locale, draft)
  } catch (e) {
    const fs = await import('fs')
    fs.appendFileSync('debug-error.log', `\n===== queryHomeGlobal =====\n${(e as Error).stack}\n`)
    throw e
  }

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
  return generateMeta({ doc: home as any })
}

const queryHomeGlobal = cache(async (locale: string, draft: boolean) => {
  const payload = await getPayload({ config: configPromise })

  const home = await payload.findGlobal({
    slug: 'home',
    depth: 2,
    draft,
    overrideAccess: draft,
    locale: locale as 'en' | 'vi',
  })

  return home || null
})
