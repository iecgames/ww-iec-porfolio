import type { Metadata } from 'next/types'

import type { Post } from '@/payload-types'
import configPromise from '@payload-config'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { CategoryArchiveView } from './CategoryArchiveView'

export const dynamic = 'force-static'
export const revalidate = 600

type Args = {
  params: Promise<{ locale: string; slug?: string }>
}

const queryCategoryBySlug = async (slug: string, locale: 'en' | 'vi') => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'categories',
    limit: 1,
    pagination: false,
    depth: 0,
    locale,
    where: { slug: { equals: slug } },
  })
  return result.docs?.[0] ?? null
}

export default async function CategoryArchive({ params: paramsPromise }: Args) {
  const { slug = '', locale } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const loc = locale as 'en' | 'vi'

  const category = await queryCategoryBySlug(decodedSlug, loc)
  if (!category) notFound()

  const [tSearch, tPosts, payload] = await Promise.all([
    getTranslations('Search'),
    getTranslations('Posts'),
    getPayload({ config: configPromise }),
  ])

  const { docs, totalDocs } = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 48,
    overrideAccess: false,
    locale: loc,
    sort: '-publishedAt',
    where: { categories: { in: [category.id] } },
    select: {
      title: true,
      slug: true,
      heroImage: true,
      categories: true,
      tags: true,
      meta: true,
      publishedAt: true,
    },
  })

  return (
    <CategoryArchiveView
      eyebrow={tSearch('groups.categories')}
      heading={category.title}
      countLabel={totalDocs > 0 ? tPosts('postsInCategory', { count: totalDocs }) : undefined}
      emptyLabel={tPosts('noPostsInCategory')}
      posts={docs as Post[]}
    />
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '', locale } = await paramsPromise
  const category = await queryCategoryBySlug(decodeURIComponent(slug), locale as 'en' | 'vi')
  return {
    title: category?.title ? `${category.title}` : 'Category',
  }
}
