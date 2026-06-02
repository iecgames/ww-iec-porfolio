import React from 'react'

import type { Page } from '@/payload-types'

import { BrandHero } from '@/heros/BrandHero'
import { VideoHero } from '@/heros/VideoHero'

const heroes = {
  brandHero: BrandHero,
  videoHero: VideoHero,
}

export const RenderHero: React.FC<Page['hero']> = (props) => {
  const { type } = props || {}

  if (!type || type === 'none') return null

  const HeroToRender = heroes[type]

  if (!HeroToRender) return null

  // @ts-ignore
  return <HeroToRender {...props} />
}
