import type { Post } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

/**
 * Latest posts in one category, for the showcase collage.
 * Tagged on `posts` — the rows themselves are posts; a category rename does not
 * change which posts come back.
 */
export const getCachedShowcasePosts = (categoryId: string, limit: number) =>
  unstable_cache(
    async (): Promise<Post[]> => {
      const payload = await getPayload({ config: configPromise })

      const { docs } = await payload.find({
        collection: 'posts',
        where: { categories: { contains: categoryId } },
        sort: '-publishedAt',
        limit,
        depth: 1,
      })

      return docs
    },
    ['category-showcase', categoryId, String(limit)],
    { tags: ['posts'] },
  )
