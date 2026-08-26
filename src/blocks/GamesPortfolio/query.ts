import type { Game } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

/**
 * Upper bound for the collection mode. The block previously fetched with
 * `pagination: false` and no limit, which grows unbounded with the collection.
 */
const GAMES_LIMIT = 100

/** All games, newest first — the block's `collection` mode. */
export const getCachedAllGames = (locale: 'en' | 'vi') =>
  unstable_cache(
    async (): Promise<Game[]> => {
      const payload = await getPayload({ config: configPromise })

      const { docs } = await payload.find({
        collection: 'games',
        depth: 1,
        limit: GAMES_LIMIT,
        sort: '-publishedAt',
        locale,
      })

      return docs
    },
    ['games-portfolio-all', String(GAMES_LIMIT), locale],
    { tags: ['games'] },
  )

/**
 * Games looked up by id — the `selection` mode's fallback when Payload hands
 * back bare ids instead of populated objects. Ids are sorted for a stable key;
 * the caller restores the editor's chosen order.
 */
export const getCachedGamesByIds = (ids: string[], locale: 'en' | 'vi') => {
  const sortedIds = [...ids].sort()

  return unstable_cache(
    async (): Promise<Game[]> => {
      const payload = await getPayload({ config: configPromise })

      const { docs } = await payload.find({
        collection: 'games',
        where: { id: { in: sortedIds } },
        depth: 1,
        limit: sortedIds.length,
        locale,
      })

      return docs
    },
    ['games-portfolio-by-ids', sortedIds.join(','), locale],
    { tags: ['games'] },
  )
}
