import React from 'react'

import type { Game, GamesPortfolioBlock as Props } from '@/payload-types'

import { GamesCarousel } from './GamesCarousel'
import { GamesPortfolioShell } from './GamesPortfolioShell'
import { getCachedAllGames, getCachedGamesByIds } from './query'

export const GamesPortfolioBlock: React.FC<Props & { id?: string }> = async (props) => {
  const { eyebrow, heading, populateBy, selectedGames } = props

  let games: Game[] = []

  if (populateBy === 'collection') {
    games = await getCachedAllGames()()
  } else if (Array.isArray(selectedGames) && selectedGames.length > 0) {
    // Payload may return resolved objects or bare IDs depending on fetch depth.
    // Handle both cases: use objects directly, fetch any unresolved IDs.
    const resolvedGames = selectedGames.filter((g): g is Game => typeof g === 'object')
    const unresolvedIds = selectedGames.filter((g): g is string => typeof g === 'string')

    if (unresolvedIds.length > 0) {
      const fetchedDocs = await getCachedGamesByIds(unresolvedIds)()
      // Merge while preserving the original selection order
      const byId = new Map(fetchedDocs.map((g) => [String(g.id), g]))
      const merged = new Map(resolvedGames.map((g) => [String(g.id), g]))
      unresolvedIds.forEach((id) => {
        const g = byId.get(id)
        if (g) merged.set(id, g)
      })
      // Rebuild in original selection order
      games = selectedGames
        .map((g) => {
          const id = typeof g === 'object' ? String(g.id) : String(g)
          return merged.get(id)
        })
        .filter((g): g is Game => !!g)
    } else {
      games = resolvedGames
    }
  }

  if (games.length === 0) return null

  return (
    <GamesPortfolioShell>
      <GamesCarousel games={games} eyebrow={eyebrow ?? undefined} heading={heading} />
    </GamesPortfolioShell>
  )
}
