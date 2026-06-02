'use client'

import { IconArrowRight } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import React from 'react'

const RIPPLE_GRADIENT = 'linear-gradient(120deg, #E11D48 0%, #EC4899 55%, #FB923C 100%)'

/** Pill CTA link that emits a gradient ripple from the cursor on hover. */
export const RippleLink: React.FC<{ href: string; label: string }> = ({ href, label }) => {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])

  const addRipple = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { x, y, id }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 800)
  }

  return (
    <Link
      href={href}
      onMouseEnter={addRipple}
      className="group relative inline-flex items-center justify-between gap-4 overflow-hidden rounded-full bg-slate-900 px-7 py-4 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(15,23,42,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(225,29,72,0.55)] md:text-base"
    >
      {/* Persistent gradient background on hover */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{ background: RIPPLE_GRADIENT }}
      />
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{ left: r.x, top: r.y, background: RIPPLE_GRADIENT }}
          initial={{ width: 0, height: 0, x: '-50%', y: '-50%', opacity: 0.85 }}
          animate={{ width: 480, height: 480, x: '-50%', y: '-50%', opacity: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        />
      ))}
      <span className="relative z-10">{label}</span>
      <span className="relative z-10 inline-flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:bg-white/25">
        <IconArrowRight className="size-4" stroke={2.4} />
      </span>
    </Link>
  )
}
