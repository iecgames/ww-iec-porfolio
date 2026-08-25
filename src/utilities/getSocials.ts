import type { Social } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

async function getSocials(): Promise<Social[]> {
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'social',
    limit: 20,
    depth: 0,
    sort: 'order',
  })

  return docs as Social[]
}

/**
 * Site-wide social links. Read by both the Footer and the SendUsCV block, so a
 * page rendering both used to hit Mongo twice for the same rows. Cached under a
 * single tag, invalidated by revalidateSocial on any create/update/delete.
 */
export const getCachedSocials = () =>
  unstable_cache(async () => getSocials(), ['social'], {
    tags: ['social'],
  })
