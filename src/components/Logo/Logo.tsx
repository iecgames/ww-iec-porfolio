import clsx from 'clsx'
import NextImage from 'next/image'

import { getMediaUrl } from '@/utilities/getMediaUrl'

const FALLBACK_ALT = 'IEC Logo'

/**
 * Ratio used to reserve space before the image loads and to derive the missing
 * side when only one of width/height is given.
 *
 * These are a last resort. When the caller passes the media's real dimensions
 * the layout box matches the image exactly and nothing shifts; when it does
 * not, the box is wrong by whatever the real ratio differs by. That was the
 * bug: the header rendered a 2316x954 logo (2.43:1) inside a box reserved from
 * a 193x34 constant (5.68:1), so the header grew from 34px to 50px tall the
 * moment the image arrived and pushed the whole page down. Measured CLS on
 * desktop was 0.254.
 */
const NATURAL_WIDTH = 193
const NATURAL_HEIGHT = 34

/**
 * Rendered box per size. `maxWidthPx` mirrors the `max-w-*` class and is what
 * `sizes` reports to the browser — without it Next would build a srcset around
 * the media's intrinsic width (2316px for the current logo) and happily serve
 * a multi-megapixel file for a 50px-tall mark.
 */
const LOGO_SIZE = {
  small: { className: 'max-h-12.5 w-auto max-w-37.5', maxWidthPx: 150 },
  medium: { className: 'max-h-15 w-auto max-w-45', maxWidthPx: 180 },
  large: { className: 'max-h-20 w-auto max-w-60', maxWidthPx: 240 },
} as const

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  size?: 'small' | 'medium' | 'large'
  /** Logo image URL from General Settings. Nothing renders when absent. */
  src?: string | null
  alt?: string | null
  imgWidth?: number | null
  imgHeight?: number | null
  /** Media `updatedAt`, appended to the URL so replacing the logo busts the optimizer cache. */
  cacheTag?: string | null
}

export const Logo = (props: Props) => {
  const {
    loading: loadingFromProps,
    priority: priorityFromProps,
    className,
    src,
    alt,
    imgWidth,
    imgHeight,
    cacheTag,
  } = props

  // No logo configured renders nothing. The previous fallback pointed at
  // Payload's own logo on raw.githubusercontent.com, a host that is not in
  // `images.remotePatterns` and so cannot be optimized — and shipping another
  // product's branding on a missing-asset path is worse than showing nothing.
  if (!src) return null

  const { className: sizeClassName, maxWidthPx } = LOGO_SIZE[props.size || 'small']

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'
  const resolvedAlt = alt || FALLBACK_ALT

  const hasWidth = typeof imgWidth === 'number' && imgWidth > 0
  const hasHeight = typeof imgHeight === 'number' && imgHeight > 0

  let attrWidth = NATURAL_WIDTH
  let attrHeight = NATURAL_HEIGHT
  if (hasWidth && hasHeight) {
    attrWidth = imgWidth as number
    attrHeight = imgHeight as number
  } else if (hasWidth) {
    attrWidth = imgWidth as number
    attrHeight = Math.round((attrWidth * NATURAL_HEIGHT) / NATURAL_WIDTH)
  } else if (hasHeight) {
    attrHeight = imgHeight as number
    attrWidth = Math.round((attrHeight * NATURAL_WIDTH) / NATURAL_HEIGHT)
  }

  return (
    <NextImage
      alt={resolvedAlt}
      width={attrWidth}
      height={attrHeight}
      loading={priority === 'high' ? undefined : loading}
      priority={priority === 'high'}
      fetchPriority={priority}
      quality={80}
      sizes={`${maxWidthPx}px`}
      className={clsx(sizeClassName, className)}
      src={getMediaUrl(src, cacheTag)}
    />
  )
}
