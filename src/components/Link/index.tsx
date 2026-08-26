import { Button, type ButtonProps } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { resolveLinkHref } from '@/utilities/resolveLinkHref'
import { cn } from '@/utilities/ui'
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
  type?: 'custom' | 'reference' | 'route' | 'section' | null
  url?: string | null
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
  } = props

  const resolved = resolveLinkHref({ type, reference, route, section, url })
  if (!resolved) return null

  const { href } = resolved

  const size = appearance === 'link' ? 'clear' : sizeFromProps
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
