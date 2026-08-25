import type { Post } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

/** Most recent posts for the "life at IEC" strip. */
export const getCachedIECLifePosts = (limit: number) =>
  unstable_cache(
    async (): Promise<Post[]> => {
      const payload = await getPayload({ config: configPromise })

      const { docs } = await payload.find({
        collection: 'posts',
        sort: '-publishedAt',
        limit,
        depth: 1,
      })

      return docs
    },
    ['iec-life', String(limit)],
    { tags: ['posts'] },
  )
