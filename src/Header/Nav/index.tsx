'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { CMSLink } from '@/components/Link'
import { useSearchModal } from '@/providers/SearchModal'
import { IconSearch } from '@tabler/icons-react'
import { MobileMenu } from '../MobileMenu'

const navLinkClass =
  'relative inline-block px-1 py-1 text-lg font-medium uppercase tracking-wide text-foreground transition-colors hover:text-primary after:absolute after:left-1 after:right-1 after:-bottom-0.5 after:h-0.5 after:bg-primary after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100'

function SearchBarButton() {
  const { openModal } = useSearchModal()
  return (
    <button
      onClick={openModal}
      aria-label="Search"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-default-100 hover:bg-default-200 border border-default-300 transition-colors text-foreground-500 hover:text-foreground text-sm"
    >
      <IconSearch size={14} className="shrink-0" />
      <span className="hidden sm:inline">Search</span>
      <span className="hidden sm:inline-flex items-center gap-0.5">
        <kbd className="px-1.5 py-0.5 text-xs bg-background rounded border border-default-300 leading-none">
          Ctrl
        </kbd>
        <kbd className="px-1.5 py-0.5 text-xs bg-background rounded border border-default-300 leading-none">
          K
        </kbd>
      </span>
    </button>
  )
}

export const HeaderNav: React.FC<{
  data: HeaderType
  centered?: boolean
}> = ({ data, centered }) => {
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
        <SearchBarButton />
        <LanguageSwitcher />
      </div>

      {/* Mobile / tablet: hamburger + full-screen menu */}
      <div className="ml-auto lg:hidden">
        <MobileMenu navItems={navItems} />
      </div>
    </>
  )
}
