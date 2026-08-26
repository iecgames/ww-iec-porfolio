import { Button, buttonVariants, type ButtonProps } from '@/components/ui/button'
import { VideoPopup } from '@/components/VideoPopup'
import { Link } from '@/i18n/navigation'
import { resolveLinkHref } from '@/utilities/resolveLinkHref'
import { cn } from '@/utilities/ui'
import { IconPlayerPlayFilled } from '@tabler/icons-react'
import React from 'react'

import type { Page, Post } from '@/payload-types'

type CMSLinkType = {
  appearance?: 'inline' | ButtonProps['variant']
  children?: React.ReactNode
  className?: string
  label?: string | null
  newTab?: boolean | null
  reference?: {
    relationTo: 'pages' | 'posts'
    value: Page | Post | string | number
  } | null
  route?: string | null
  section?: string | null
  size?: ButtonProps['size'] | null
  type?: 'custom' | 'reference' | 'route' | 'section' | 'video' | null
  url?: string | null
  video?: string | null
}

export const CMSLink: React.FC<CMSLinkType> = (props) => {
  const {
    type,
    appearance = 'inline',
    children,
    className,
    label,
    newTab,
    reference,
    route,
    section,
    size: sizeFromProps,
    url,
    video,
  } = props

  const size = appearance === 'link' ? 'clear' : sizeFromProps

  // A video link opens a popup instead of navigating, so it never reaches the
  // href resolver. The trigger mirrors the styling of a normal link so the two
  // sit together without looking out of place.
  if (type === 'video') {
    if (!video) return null

    const content = (
      <>
        <IconPlayerPlayFilled size={16} />
        {label && label}
        {children && children}
      </>
    )

    // Not wrapped in <Button asChild>: that uses a Radix Slot, which clones a
    // single child, while VideoPopup returns a fragment (button + modal).
    // Borrow the button classes instead.
    const triggerClass =
      appearance === 'inline'
        ? cn('inline-flex items-center gap-2', className)
        : cn(buttonVariants({ variant: appearance, size, className }))

    return (
      <VideoPopup
        url={video}
        ariaLabel={label ?? undefined}
        className={triggerClass}
        trigger={content}
      />
    )
  }

  const resolved = resolveLinkHref({ type, reference, route, section, url })
  if (!resolved) return null

  const { href } = resolved

  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  /* Ensure we don't break any styles set by richText */
  if (appearance === 'inline') {
    return (
      <Link className={cn(className)} href={href} {...newTabProps}>
        {label && label}
        {children && children}
      </Link>
    )
  }

  return (
    <Button asChild className={className} size={size} variant={appearance}>
      <Link className={cn(className)} href={href} {...newTabProps}>
        {label && label}
        {children && children}
      </Link>
    </Button>
  )
}
