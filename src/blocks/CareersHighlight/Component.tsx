import React from 'react'

import type { CareersHighlightBlock as Props, Media } from '@/payload-types'

import { CareersHighlightView } from './CareersHighlightView'
import { getCachedHighlightJobs } from './query'

export const CareersHighlightBlock: React.FC<Props & { id?: string }> = async ({
  eyebrow,
  heading,
  headingHighlight,
  description,
  heroImage,
  limit: limitFromProps,
  ctaLabel,
  ctaLink,
}) => {
  const limit = limitFromProps || 3

  // Featured jobs, falling back to the most recent ones — see ./query.ts
  const jobs = await getCachedHighlightJobs(limit)()

  const resolvedHeroImage =
    heroImage && typeof heroImage === 'object' ? (heroImage as Media) : null

  return (
    <CareersHighlightView
      eyebrow={eyebrow}
      heading={heading}
      headingHighlight={headingHighlight}
      description={description}
      ctaLabel={ctaLabel}
      ctaLink={ctaLink}
      heroImage={resolvedHeroImage}
      jobs={jobs}
    />
  )
}
