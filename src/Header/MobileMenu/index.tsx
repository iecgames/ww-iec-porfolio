'use client'

import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import type { Header as HeaderType } from '@/payload-types'

import { FlagBadge, locales, useLocaleSwitcher } from '@/components/LanguageSwitcher'
import { CMSLink } from '@/components/Link'
import { useSearchModal } from '@/providers/SearchModal'
import { cn } from '@/utilities/ui'
import { IconCheck, IconMenu2, IconSearch, IconX } from '@tabler/icons-react'

type NavItems = NonNullable<HeaderType['navItems']>

/** Origin of the circular reveal — matches the close button's top-right position. */
const REVEAL_ORIGIN = 'calc(100% - 3rem) 3rem'

const overlayVariants: Variants = {
  closed: {
    clipPath: `circle(0% at ${REVEAL_ORIGIN})`,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
  open: {
    clipPath: `circle(150% at ${REVEAL_ORIGIN})`,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const listVariants: Variants = {
  closed: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  open: { transition: { delayChildren: 0.2, staggerChildren: 0.08 } },
}

const itemVariants: Variants = {
  closed: { opacity: 0, y: 40 },
  open: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const linkClass =
  'block bg-[linear-gradient(90deg,#2563EB_0%,#38BDF8_100%)] bg-clip-text py-2 text-4xl font-extrabold uppercase tracking-tight text-slate-900 transition-all duration-300 hover:text-transparent sm:text-5xl'

export function MobileMenu({ navItems }: { navItems: NavItems }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { openModal } = useSearchModal()
  const { locale, switchLocale } = useLocaleSwitcher()

  useEffect(() => setMounted(true), [])

  // Lock body scroll while the menu is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Hamburger trigger (mobile only) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <IconMenu2 size={26} />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="mobile-menu"
                role="dialog"
                aria-modal="true"
                variants={overlayVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl"
                style={{ fontFamily: 'var(--font-space-grotesk, system-ui, sans-serif)' }}
              >
                {/* Decorative gradient blobs */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
                  style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full opacity-25 blur-3xl"
                  style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
                />

                {/* Close button */}
                <div className="relative flex justify-end p-6">
                  <motion.button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1, transition: { delay: 0.25, duration: 0.4 } }}
                    exit={{ rotate: 90, opacity: 0, transition: { duration: 0.2 } }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-900/15 bg-white/60 text-slate-900 shadow-sm transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <IconX size={26} />
                  </motion.button>
                </div>

                {/* Nav links */}
                <motion.nav
                  variants={listVariants}
                  className="relative flex flex-1 flex-col items-center justify-center gap-1 px-8 text-center"
                >
                  {navItems.map(({ link }, i) => (
                    <motion.div key={i} variants={itemVariants} onClick={() => setOpen(false)}>
                      <CMSLink {...link} appearance="inline" className={linkClass} />
                    </motion.div>
                  ))}
                </motion.nav>

                {/* Footer actions */}
                <motion.div
                  variants={itemVariants}
                  className="relative flex flex-col items-center gap-4 p-8"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      openModal()
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-900/15 bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <IconSearch size={16} />
                    Search
                  </button>

                  {/* Inline language pills (HeroUI dropdown would sit behind this overlay) */}
                  <div className="flex items-center gap-2">
                    {locales.map(({ code, label, flag }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => switchLocale(code)}
                        aria-pressed={code === locale}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                          code === locale
                            ? 'border-transparent bg-slate-900 text-white'
                            : 'border-slate-900/15 bg-white/60 text-slate-700 hover:bg-slate-900/5',
                        )}
                      >
                        <FlagBadge src={flag} alt={label} />
                        {label}
                        {code === locale && <IconCheck size={16} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
