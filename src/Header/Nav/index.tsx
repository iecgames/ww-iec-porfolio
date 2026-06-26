'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { CMSLink } from '@/components/Link'
import { useSearchModal } from '@/providers/SearchModal'
import { cn } from '@/utilities/ui'
import { IconSearch } from '@tabler/icons-react'
import { MobileMenu } from '../MobileMenu'

const navLinkClass =
  'relative inline-block px-1 py-1 text-lg font-medium uppercase tracking-wide text-foreground transition-colors hover:text-primary after:absolute after:left-1 after:right-1 after:-bottom-0.5 after:h-0.5 after:bg-primary after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100'

function SearchBarButton({ solid }: { solid: boolean }) {
  const { openModal } = useSearchModal()
  // The button is a glassy control that derives its tint from the header's own
  // background so it reads as part of the bar in both states:
  // - solid header (frosted white): a faint neutral fill that sits gently on white
  // - transparent header (over a hero): translucent white-glass with blur
  return (
    <button
      onClick={openModal}
      aria-label="Search"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm transition-colors text-sm text-foreground-600 hover:text-foreground',
        solid
          ? 'bg-foreground/4 hover:bg-foreground/8 border-foreground/10'
          : 'bg-white/20 hover:bg-white/30 border-white/40',
      )}
    >
      <IconSearch size={14} className="shrink-0" />
      <span className="hidden sm:inline">Search</span>
      <span className="hidden sm:inline-flex items-center gap-0.5">
        <kbd
          className={cn(
            'px-1.5 py-0.5 text-xs rounded border leading-none',
            solid ? 'bg-white/60 border-foreground/10' : 'bg-white/30 border-white/40',
          )}
        >
          Ctrl
        </kbd>
        <kbd
          className={cn(
            'px-1.5 py-0.5 text-xs rounded border leading-none',
            solid ? 'bg-white/60 border-foreground/10' : 'bg-white/30 border-white/40',
          )}
        >
          K
        </kbd>
      </span>
    </button>
  )
}

export const HeaderNav: React.FC<{
  data: HeaderType
  centered?: boolean
  solid?: boolean
}> = ({ data, centered, solid = true }) => {
  const navItems = data?.navItems || []

  const links = navItems.map(({ link }, i) => (
    <CMSLink key={i} {...link} appearance="inline" className={navLinkClass} />
  ))

  // Desktop (md+): the actions group (search + language) stays pinned right via
  // `justify-end`, and only its `flex-grow` transitions (1 → 0). That smoothly
  // glides the nav from center → right with a plain CSS transition — no layout
  // thrash, no jank. Mobile (<md): everything collapses into the hamburger menu.
  return (
    <>
      <nav className="hidden gap-6 items-center lg:flex">{links}</nav>
      <div
        className="hidden items-center justify-end gap-3 lg:flex"
        style={{
          flexGrow: centered ? 1 : 0,
          transition: 'flex-grow 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <SearchBarButton solid={solid} />
        <LanguageSwitcher />
      </div>

      {/* Mobile / tablet: hamburger + full-screen menu */}
      <div className="ml-auto lg:hidden">
        <MobileMenu navItems={navItems} />
      </div>
    </>
  )
}
