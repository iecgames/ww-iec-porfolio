import type { Block } from 'payload'
import { anchorField } from '@/blocks/anchorField'
import { Archive } from '@/blocks/ArchiveBlock/config'
import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { FormBlock } from '@/blocks/Form/config'
import { JobBoard } from '@/blocks/JobBoard/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { NewsletterSignup } from '@/blocks/NewsletterSignup/config'
import { SendUsCV } from '@/blocks/SendUsCV/config'

import { AboutWithStats } from '@/blocks/AboutWithStats/config'
import { CareersHighlight } from '@/blocks/CareersHighlight/config'
import { CategoryShowcase } from '@/blocks/CategoryShowcase/config'
import { CoreValuesShowcase } from '@/blocks/CoreValuesShowcase/config'
import { FeatureTabs } from '@/blocks/FeatureTabs/config'
import { GamesPortfolio } from '@/blocks/GamesPortfolio/config'
import { IECLife } from '@/blocks/IECLife/config'

/** Append the shared Anchor ID field to a block so every section is linkable. */
const withAnchor = (block: Block): Block => ({
  ...block,
  fields: [...block.fields, anchorField],
})

/**
 * Blocks available on both the Pages collection and the Home global,
 * so editors can compose any layout from the same set of blocks.
 * Every block gets an Anchor ID field (see {@link withAnchor}).
 */
export const sharedLayoutBlocks: Block[] = [
  CallToAction,
  Content,
  MediaBlock,
  Archive,
  FormBlock,
  JobBoard,
  SendUsCV,
  NewsletterSignup,
  AboutWithStats,
  GamesPortfolio,
  CoreValuesShowcase,
  CareersHighlight,
  FeatureTabs,
  IECLife,
  CategoryShowcase,
].map(withAnchor)
