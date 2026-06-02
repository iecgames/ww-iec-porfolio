'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { useTransparentHeader } from '@/providers/TransparentHeader'
import { cn } from '@/utilities/ui'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
  logoSrc?: string | null
  logoAlt?: string | null
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data, logoSrc, logoAlt }) => {
  const pathname = usePathname()
  const isPostsPage = /(^|\/)posts(\/|$)/.test(pathname)
  const { transparent } = useTransparentHeader()
  const isTransparent = isPostsPage || transparent

  return (
    <header
      className={cn(
        'relative z-20 bg-transparent',
        !isTransparent && 'border-b border-gray-200/70',
      )}
      style={{ fontFamily: 'var(--font-space-grotesk, system-ui, sans-serif)' }}
    >
      <div className="container">
        <div className={cn('flex items-center', isTransparent ? 'py-10' : 'py-8 justify-between')}>
          <div className={isTransparent ? 'flex-1' : ''}>
            <Link href="/">
              <Logo loading="eager" priority="high" src={logoSrc} alt={logoAlt} />
            </Link>
          </div>
          <HeaderNav data={data} centered={isTransparent} />
        </div>
      </div>
    </header>
  )
}
