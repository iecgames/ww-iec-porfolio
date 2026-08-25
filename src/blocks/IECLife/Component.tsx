import React from 'react'

import type { IECLifeBlock as Props } from '@/payload-types'

import { IECLifeView } from './IECLifeView'
import { getCachedIECLifePosts } from './query'

export const IECLifeBlock: React.FC<Props & { id?: string }> = async ({
  eyebrow,
  heading,
  ctaLabel,
  limit: limitFromProps,
}) => {
  const limit = limitFromProps || 4

  const posts = await getCachedIECLifePosts(limit)()
  if (posts.length === 0) return null

  return (
    <IECLifeView posts={posts} eyebrow={eyebrow} heading={heading} ctaLabel={ctaLabel} />
  )
}
