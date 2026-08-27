'use client'

import React, { useState } from 'react'

import type { FeatureTabsBlock as Props } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'

export const FeatureTabsBlock: React.FC<Props> = ({ tabs }) => {
  const [active, setActive] = useState(0)

  if (!Array.isArray(tabs) || tabs.length === 0) return null

  const current = tabs[active]

  return (
    <section className="container">
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border md:gap-6">
        {tabs.map((tab, i) => (
          <button
            type="button"
            key={tab.id ?? i}
            onClick={() => setActive(i)}
            className={cn(
              'flex items-center gap-2 px-3 py-3 text-sm font-semibold uppercase tracking-wide transition-colors',
              i === active
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon && typeof tab.icon === 'object' && (
              <span className="inline-block h-5 w-5">
                {/* Wrapper span is h-5 w-5. */}
                <Media
                  resource={tab.icon}
                  imgClassName="h-full w-full object-contain"
                  size="20px"
                />
              </span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {current?.description && (
        <div className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
          <RichText data={current.description} enableGutter={false} />
        </div>
      )}
    </section>
  )
}
