import type { Job } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

const JOB_BOARD_LIMIT = 200

/** Every open position, for the filterable job board. */
export const getCachedJobBoardJobs = () =>
  unstable_cache(
    async (): Promise<Job[]> => {
      const payload = await getPayload({ config: configPromise })

      const { docs } = await payload.find({
        collection: 'jobs',
        limit: JOB_BOARD_LIMIT,
        depth: 0,
      })

      return docs as Job[]
    },
    ['job-board', String(JOB_BOARD_LIMIT)],
    { tags: ['jobs'] },
  )
