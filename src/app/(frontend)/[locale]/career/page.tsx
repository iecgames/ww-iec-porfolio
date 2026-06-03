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
import PageClient from '../[slug]/page.client'

type Args = {
  params: Promise<{ locale: string }>
}

export default async function CareerPage({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { locale } = await paramsPromise
  const url = '/career'

  const career = await queryCareerGlobal(locale, draft)

  if (!career) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = career

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}
      {hero && <RenderHero {...hero} />}
      {Array.isArray(layout) && <RenderBlocks blocks={layout} />}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale } = await paramsPromise
  const career = await queryCareerGlobal(locale, false)
  return generateMeta({ doc: career as any, locale: locale as 'en' | 'vi' })
}

const queryCareerGlobal = cache(async (locale: string, draft: boolean) => {
  const payload = await getPayload({ config: configPromise })

  const career = await payload.findGlobal({
    slug: 'career',
    depth: 2,
    draft,
    overrideAccess: draft,
    locale: locale as 'en' | 'vi',
  })

  return career || null
})
