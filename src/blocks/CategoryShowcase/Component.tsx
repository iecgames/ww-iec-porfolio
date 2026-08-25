import React from 'react'

import type { Category, CategoryShowcaseBlock as Props } from '@/payload-types'

import { CategoryShowcaseView } from './CategoryShowcaseView'
import { getCachedShowcasePosts } from './query'

const COLLAGE_COUNT = 5

export const CategoryShowcaseBlock: React.FC<Props & { id?: string }> = async ({
  eyebrow,
  heading,
  description,
  category,
  ctaLabel,
}) => {
  const categoryId =
    typeof category === 'object' && category !== null ? category.id : category

  if (!categoryId) return null

  const posts = await getCachedShowcasePosts(String(categoryId), COLLAGE_COUNT)()
  if (posts.length === 0) return null

  const categoryResolved =
    typeof category === 'object' && category !== null ? (category as Category) : null

  return (
    <CategoryShowcaseView
      eyebrow={eyebrow}
      heading={heading}
      description={description}
      ctaLabel={ctaLabel}
      category={categoryResolved}
      posts={posts}
    />
  )
}
