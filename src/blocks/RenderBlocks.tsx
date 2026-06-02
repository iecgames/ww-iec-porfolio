import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { toAnchorId } from '@/blocks/anchorField'
import { cn } from '@/utilities/ui'
import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { JobBoardBlock } from '@/blocks/JobBoard/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { NewsletterSignupBlock } from '@/blocks/NewsletterSignup/Component'
import { SendUsCVBlock } from '@/blocks/SendUsCV/Component'

import { AboutWithStatsBlock } from '@/blocks/AboutWithStats/Component'
import { CareersHighlightBlock } from '@/blocks/CareersHighlight/Component'
import { CategoryShowcaseBlock } from '@/blocks/CategoryShowcase/Component'
import { CoreValuesShowcaseBlock } from '@/blocks/CoreValuesShowcase/Component'
import { FeatureTabsBlock } from '@/blocks/FeatureTabs/Component'
import { GamesPortfolioBlock } from '@/blocks/GamesPortfolio/Component'
import { IECLifeBlock } from '@/blocks/IECLife/Component'

const blockComponents = {
  archive: ArchiveBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  jobBoard: JobBoardBlock,
  mediaBlock: MediaBlock,
  sendUsCV: SendUsCVBlock,
  newsletterSignup: NewsletterSignupBlock,
  aboutWithStats: AboutWithStatsBlock,
  gamesPortfolio: GamesPortfolioBlock,
  coreValuesShowcase: CoreValuesShowcaseBlock,
  careersHighlight: CareersHighlightBlock,
  featureTabs: FeatureTabsBlock,
  iecLife: IECLifeBlock,
  categoryShowcase: CategoryShowcaseBlock,
}

// Blocks that manage their own vertical spacing — skip the outer `my-16` wrapper.
const flushBlocks = new Set(['aboutWithStats', 'iecLife', 'categoryShowcase'])

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (!hasBlocks) return null

  return (
    <Fragment>
      {blocks.map((block, index) => {
        const { blockType } = block

        if (blockType && blockType in blockComponents) {
          const Block = blockComponents[blockType]

          if (Block) {
            const isFlush = flushBlocks.has(blockType)
            const anchorId = toAnchorId('anchor' in block ? block.anchor : undefined)
            return (
              <div
                id={anchorId}
                className={cn(isFlush ? undefined : 'my-16', anchorId && 'scroll-mt-24')}
                key={index}
              >
                {/* @ts-expect-error there may be some mismatch between the expected types here */}
                <Block {...block} disableInnerContainer />
              </div>
            )
          }
        }
        return null
      })}
    </Fragment>
  )
}
