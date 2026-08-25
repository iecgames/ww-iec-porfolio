import type { Job } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

/**
 * Featured jobs for the careers highlight, falling back to the most recent ones
 * so the section never renders empty while the collection has data.
 *
 * Both queries live inside a single cached function: the fallback only runs
 * when the first returns nothing, and caching the pair keeps that decision from
 * being re-made on every render.
 */
export const getCachedHighlightJobs = (limit: number) =>
  unstable_cache(
    async (): Promise<Job[]> => {
      const payload = await getPayload({ config: configPromise })

      const { docs: featuredDocs } = await payload.find({
        collection: 'jobs',
        where: { isFeatured: { equals: true } },
        sort: '-createdAt',
        limit,
        depth: 0,
      })

      if (featuredDocs.length > 0) return featuredDocs as Job[]

      const { docs: recentDocs } = await payload.find({
        collection: 'jobs',
        sort: '-createdAt',
        limit,
        depth: 0,
      })

      return recentDocs as Job[]
    },
    ['careers-highlight', String(limit)],
    { tags: ['jobs'] },
  )
