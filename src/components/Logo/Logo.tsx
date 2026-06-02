import clsx from 'clsx'

const FALLBACK_SRC =
  'https://raw.githubusercontent.com/payloadcms/payload/3.x/packages/ui/src/assets/payload-logo-light.svg'
const FALLBACK_ALT = 'IEC Logo'

// Intrinsic ratio used to (a) reserve space before load and (b) derive the
// missing side when only one of width/height is provided.
const NATURAL_WIDTH = 193
const NATURAL_HEIGHT = 34

const LOGO_SIZE = {
  small: 'max-h-12.5 w-auto max-w-37.5',
  medium: 'max-h-15 w-auto max-w-45',
  large: 'max-h-20 w-auto max-w-60',
}
interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  size?: 'small' | 'medium' | 'large'
  /** Logo image URL from General Settings. Falls back to default when absent. */
  src?: string | null
  alt?: string | null
  imgWidth?: number | null
  imgHeight?: number | null
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
  } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'
  const resolvedSrc = src || FALLBACK_SRC
  const resolvedAlt = alt || FALLBACK_ALT

  const hasWidth = typeof imgWidth === 'number' && imgWidth > 0
  const hasHeight = typeof imgHeight === 'number' && imgHeight > 0

  // width/height attributes — keep aspect ratio when only one side is given,
  // so the browser reserves the right amount of space (avoids layout shift).
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
    /* eslint-disable @next/next/no-img-element */
    <img
      alt={resolvedAlt}
      width={attrWidth}
      height={attrHeight}
      loading={loading}
      fetchPriority={priority}
      decoding="async"
      className={clsx(LOGO_SIZE[props.size || 'small'], className)}
      src={resolvedSrc}
    />
  )
}
