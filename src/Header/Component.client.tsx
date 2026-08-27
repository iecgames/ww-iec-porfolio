'use client'
import { Link } from '@/i18n/navigation'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { useTransparentHeader } from '@/providers/TransparentHeader'
import { cn } from '@/utilities/ui'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
  logoSrc?: string | null
  logoAlt?: string | null
  logoWidth?: number | null
  logoHeight?: number | null
  logoCacheTag?: string | null
}

export const HeaderClient: React.FC<HeaderClientProps> = ({
  data,
  logoSrc,
  logoAlt,
  logoWidth,
  logoHeight,
  logoCacheTag,
}) => {
  const pathname = usePathname()
  const isPostsPage = /(^|\/)posts(\/|$)/.test(pathname)
  const { transparent } = useTransparentHeader()
  const isTransparent = isPostsPage || transparent

  // Track scroll to give the pinned header a solid background once it leaves the top.
  // Hysteresis band (8↔24px) prevents the state from flickering right at the threshold.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled((prev) => {
        if (!prev && y > 24) return true
        if (prev && y < 8) return false
        return prev
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Solid bg on normal pages always; on transparent pages only after scrolling.
  const solid = !isTransparent || scrolled
  // Big centered hero layout only at the very top of a transparent page.
  const centered = isTransparent && !scrolled

  return (
    <header
      className={cn(
        // Transition only paint properties — layout glide is handled in HeaderNav via flex-grow.
        'sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300',
        solid
          ? 'bg-white/70 backdrop-blur-md border-b border-gray-200/70 shadow-md'
          : 'bg-transparent',
      )}
      style={{ fontFamily: 'var(--font-space-grotesk, system-ui, sans-serif)' }}
    >
      <div className="container">
        <div
          className={cn(
            'flex items-center gap-3 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            centered ? 'py-10' : 'py-4',
          )}
        >
          <div className="flex-1">
            <Link href="/">
              <Logo
                loading="eager"
                priority="high"
                src={logoSrc}
                alt={logoAlt}
                imgWidth={logoWidth}
                imgHeight={logoHeight}
                cacheTag={logoCacheTag}
              />
            </Link>
          </div>
          <HeaderNav data={data} centered={centered} solid={solid} />
        </div>
      </div>
    </header>
  )
}
