import type { Post } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

/**
 * Posts for the archive block's `collection` mode.
 *
 * The category filter and limit both shape the result, so both go into the
 * cache key — otherwise two archive blocks on one page would serve each other's
 * rows. Categories are sorted first so the same set always yields the same key.
 */
export const getCachedArchivePosts = (
  limit: number,
  categoryIds: string[],
  locale: 'en' | 'vi',
) => {
  const sortedIds = [...categoryIds].sort()

  return unstable_cache(
    async (): Promise<Post[]> => {
      const payload = await getPayload({ config: configPromise })

      const { docs } = await payload.find({
        collection: 'posts',
        depth: 1,
        limit,
        locale,
        ...(sortedIds.length > 0
          ? {
              where: {
                categories: {
                  in: sortedIds,
                },
              },
            }
          : {}),
      })

      return docs
    },
    ['archive-block', String(limit), sortedIds.join(','), locale],
    { tags: ['posts'] },
  )
}
