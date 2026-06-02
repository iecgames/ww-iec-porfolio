'use client'

import { IconArrowRight } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

export type RippleVariant = 'solid' | 'outline'

/** Default ripple/hover-fill gradient (rose → pink → orange). Override via `gradient`. */
export const DEFAULT_RIPPLE_GRADIENT =
  'linear-gradient(120deg, #E11D48 0%, #EC4899 55%, #FB923C 100%)'

const VARIANTS: Record<RippleVariant, { container: string; arrow: string }> = {
  solid: {
    container:
      'bg-slate-900 text-white shadow-[0_14px_30px_-12px_rgba(15,23,42,0.6)] hover:shadow-[0_18px_36px_-12px_rgba(15,23,42,0.5)]',
    arrow: 'bg-white/15 group-hover:bg-white/25',
  },
  outline: {
    container:
      'border-2 border-slate-900/20 bg-white/50 text-slate-900 backdrop-blur-sm shadow-sm hover:border-transparent hover:text-white',
    arrow: 'bg-slate-900/10 group-hover:bg-white/25',
  },
}

type RippleLinkProps = {
  href: string
  label: string
  /** Visual style. `solid` = filled pill, `outline` = bordered pill. */
  variant?: RippleVariant
  /** Ripple + hover-fill gradient (CSS background value). */
  gradient?: string
  /** Render a plain <a> (off-site) instead of next/link. */
  external?: boolean
  newTab?: boolean | null
  showArrow?: boolean
  className?: string
}

/**
 * Pill CTA link that emits a gradient ripple from the cursor on hover.
 * Shared across blocks — theme it per usage with `variant` + `gradient`.
 */
export const RippleLink: React.FC<RippleLinkProps> = ({
  href,
  label,
  variant = 'solid',
  gradient = DEFAULT_RIPPLE_GRADIENT,
  external = false,
  newTab,
  showArrow = true,
  className,
}) => {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])

  const addRipple = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { x, y, id }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 800)
  }

  const v = VARIANTS[variant]
  const className_ = cn(
    'group relative inline-flex items-center justify-between gap-4 overflow-hidden rounded-full px-7 py-4 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 md:text-base',
    v.container,
    className,
  )

  const content = (
    <>
      {/* Persistent gradient background on hover */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{ background: gradient }}
      />
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{ left: r.x, top: r.y, background: gradient }}
          initial={{ width: 0, height: 0, x: '-50%', y: '-50%', opacity: 0.85 }}
          animate={{ width: 480, height: 480, x: '-50%', y: '-50%', opacity: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        />
      ))}
      <span className="relative z-10">{label}</span>
      {showArrow && (
        <span
          className={cn(
            'relative z-10 inline-flex size-8 items-center justify-center rounded-full text-current transition-transform duration-300 group-hover:translate-x-1',
            v.arrow,
          )}
        >
          <IconArrowRight className="size-4" stroke={2.4} />
        </span>
      )}
    </>
  )

  const target = newTab ? '_blank' : undefined
  const rel = newTab ? 'noopener noreferrer' : undefined

  if (external) {
    return (
      <a href={href} target={target} rel={rel} onMouseEnter={addRipple} className={className_}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} target={target} rel={rel} onMouseEnter={addRipple} className={className_}>
      {content}
    </Link>
  )
}
