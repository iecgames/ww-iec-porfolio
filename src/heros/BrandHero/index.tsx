'use client'

import React, { useEffect, useRef } from 'react'
import { Link } from '@/i18n/navigation'
import { IconArrowRight, IconPlayerPlayFilled } from '@tabler/icons-react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from 'framer-motion'

import type { Home, Page, Media as MediaType } from '@/payload-types'

import { Media } from '@/components/Media'
import { ShareWidget, type SharePlatformKey } from '@/components/ShareWidget'
import { VideoPopup } from '@/components/VideoPopup'
import { useTransparentHeader } from '@/providers/TransparentHeader'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { resolveLinkHref } from '@/utilities/resolveLinkHref'

type BrandHeroProps = NonNullable<Page['hero']> | NonNullable<Home['hero']>

type DecorPosition =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'middleLeft'
  | 'middleRight'

const positionClass: Record<DecorPosition, string> = {
  topLeft: 'top-6 left-6 md:top-10 md:left-10',
  topRight: 'top-6 right-6 md:top-10 md:right-10',
  bottomLeft: 'bottom-6 left-6 md:bottom-10 md:left-10',
  bottomRight: 'bottom-6 right-6 md:bottom-10 md:right-10',
  middleLeft: 'top-1/2 left-6 -translate-y-1/2 md:left-12',
  middleRight: 'top-1/2 right-6 -translate-y-1/2 md:right-12',
}

type CtaLink = NonNullable<NonNullable<BrandHeroProps['cta']>[number]>['link']

/** Shared pill styling so a video CTA sits flush next to a navigation CTA. */
const CTA_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_14px_32px_-8px_rgba(0,111,238,0.55)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-8px_rgba(0,111,238,0.65)] md:text-base'

function CtaLinkButton({ link }: { link: CtaLink }) {
  const resolved = resolveLinkHref(link)
  if (!resolved) return null

  return (
    <Link
      href={resolved.href}
      target={link.newTab ? '_blank' : undefined}
      rel={link.newTab ? 'noreferrer' : undefined}
      className={CTA_BUTTON_CLASS}
    >
      {link.label}
      <IconArrowRight size={18} stroke={2.5} />
    </Link>
  )
}

/* ----------------------------- CountUp -------------------------------- */

function inferDecimals(n: number): number {
  if (Number.isInteger(n)) return 0
  const parts = String(n).split('.')
  return Math.min(parts[1]?.length ?? 0, 2)
}

const CountUp: React.FC<{ to: number; duration?: number }> = ({ to, duration = 1.4 }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const decimals = inferDecimals(to)

  useEffect(() => {
    if (!ref.current) return
    if (reduced) {
      ref.current.textContent = to.toFixed(decimals)
      return
    }
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: 'easeOut',
      onUpdate(v) {
        if (ref.current) ref.current.textContent = v.toFixed(decimals)
      },
    })
    return () => controls.stop()
  }, [inView, to, decimals, duration, reduced])

  return <span ref={ref}>{reduced ? to.toFixed(decimals) : (0).toFixed(decimals)}</span>
}

/* ------------------------- Stagger variants --------------------------- */

const container: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' } },
}

/* ----------------------- Decoration with parallax --------------------- */

type DecorationProps = {
  dec: NonNullable<BrandHeroProps['decorations']>[number]
  index: number
  smoothX: MotionValue<number>
  smoothY: MotionValue<number>
  reduced: boolean | null
}

const DecorationItem: React.FC<DecorationProps> = ({ dec, index, smoothX, smoothY, reduced }) => {
  // Bigger / closer items move more for a sense of depth.
  const depth = Math.max(0.4, Math.min(1.5, (dec.sizePercent ?? 8) / 10))
  const tx = useTransform(smoothX, [-1, 1], [-14 * depth, 14 * depth])
  const ty = useTransform(smoothY, [-1, 1], [-10 * depth, 10 * depth])

  if (!dec.image || typeof dec.image !== 'object') return null
  const pos = (dec.position ?? 'topLeft') as DecorPosition
  const size = dec.sizePercent ?? 8

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute select-none ${positionClass[pos]}`}
      style={{
        width: `${size}%`,
        maxWidth: '180px',
        minWidth: '40px',
        x: reduced ? 0 : tx,
        y: reduced ? 0 : ty,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.35 + index * 0.08, ease: 'easeOut' }}
    >
      {/* Wrapper caps at maxWidth 180px above; measured 135px on production. */}
      <Media
        resource={dec.image as MediaType}
        imgClassName="w-full h-auto opacity-90"
        size="180px"
      />
    </motion.div>
  )
}

/* ------------------------------ BrandHero ----------------------------- */

export const BrandHero: React.FC<BrandHeroProps> = ({
  eyebrow,
  brandHeading,
  tagline,
  inlineStats,
  cta,
  mascot,
  decorations,
  share,
}) => {
  const reduced = useReducedMotion()
  const ctaLinks = (cta ?? []).map((entry) => entry.link).filter(Boolean)
  const { setTransparent } = useTransparentHeader()

  useEffect(() => {
    setTransparent(true)
    return () => setTransparent(false)
  }, [setTransparent])

  const qrLogoUrl =
    share?.qrLogo && typeof share.qrLogo === 'object' ? getMediaUrl(share.qrLogo.url) : undefined

  // Section-scoped mouse tracking → drives mascot + decoration parallax.
  const sectionRef = useRef<HTMLElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 70, damping: 18, mass: 0.5 })
  const smoothY = useSpring(mouseY, { stiffness: 70, damping: 18, mass: 0.5 })

  const mascotX = useTransform(smoothX, [-1, 1], [-28, 28])
  const mascotY = useTransform(smoothY, [-1, 1], [-18, 18])
  const mascotRotate = useTransform(smoothX, [-1, 1], [-3, 3])

  useEffect(() => {
    if (reduced) return
    const el = sectionRef.current
    if (!el) return
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
      mouseX.set(x)
      mouseY.set(y)
    }
    const handleLeave = () => {
      mouseX.set(0)
      mouseY.set(0)
    }
    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [mouseX, mouseY, reduced])

  return (
    <section
      ref={sectionRef}
      className="relative -mt-50 flex min-h-screen items-center overflow-hidden"
    >
      {/* Background gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at top right, oklch(96% 0.04 230) 0%, transparent 55%), radial-gradient(ellipse at bottom left, oklch(96% 0.04 250) 0%, transparent 50%), #ffffff',
        }}
      />

      {/* Bottom transition: fades the hero's radial blue tints to pure white at the bottom
          edge so the seam against the next (white) section disappears. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 -z-10 h-64 md:h-80 lg:h-96"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 55%, #ffffff 100%)',
        }}
      />

      {/* Accent diagonal lines */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1440 720"
      >
        <defs>
          <linearGradient id="brandHeroLineCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#67E8F9" stopOpacity="0" />
            <stop offset="60%" stopColor="#67E8F9" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#67E8F9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="brandHeroLineSky" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.line
          x1="560"
          y1="720"
          x2="1440"
          y2="-40"
          stroke="url(#brandHeroLineCyan)"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, delay: 0.2, ease: 'easeOut' }}
        />
        <motion.line
          x1="700"
          y1="540"
          x2="1440"
          y2="360"
          stroke="url(#brandHeroLineSky)"
          strokeWidth="1.2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>

      {/* Decorations (parallax + stagger fade) */}
      {Array.isArray(decorations) &&
        decorations.map((dec, i) => (
          <DecorationItem
            key={dec.id ?? i}
            dec={dec}
            index={i}
            smoothX={smoothX}
            smoothY={smoothY}
            reduced={reduced}
          />
        ))}

      <div className="container relative w-full py-24 md:py-28 lg:py-32">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <motion.div
            className="lg:col-span-7"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {eyebrow && (
              <motion.span
                variants={item}
                className="mb-5 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-primary"
              >
                {eyebrow}
              </motion.span>
            )}

            {brandHeading && (
              <motion.div variants={item} className="relative isolate mb-6 max-w-full">
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 rounded-3xl blur-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: reduced ? 0.6 : [0.45, 0.7, 0.45] }}
                  transition={
                    reduced
                      ? { duration: 0.6 }
                      : { duration: 5, repeat: Infinity, ease: 'easeInOut' }
                  }
                  style={{
                    background:
                      'radial-gradient(50% 60% at 25% 50%, rgba(125, 211, 252, 0.6) 0%, transparent 70%), radial-gradient(50% 60% at 75% 50%, rgba(56, 189, 248, 0.45) 0%, transparent 70%), radial-gradient(60% 80% at 50% 50%, rgba(0, 111, 238, 0.25) 0%, transparent 75%)',
                  }}
                />
                <h1
                  className="bg-clip-text text-5xl font-black leading-[1.05] tracking-tight text-transparent md:text-6xl lg:text-7xl"
                  style={{
                    backgroundImage:
                      'linear-gradient(120deg, #0A2540 0%, #006FEE 40%, #38BDF8 70%, #003366 100%)',
                  }}
                >
                  {brandHeading}
                </h1>
              </motion.div>
            )}

            {tagline && (
              <motion.div variants={item} className="mb-10">
                <p className="max-w-md text-base font-medium leading-relaxed tracking-wide text-foreground/75 md:text-lg">
                  {tagline}
                </p>
                <span
                  aria-hidden
                  className="mt-6 block h-0.75 w-16 rounded-full"
                  style={{
                    background:
                      'linear-gradient(to right, #006FEE 0%, #38BDF8 70%, transparent 100%)',
                  }}
                />
              </motion.div>
            )}

            {Array.isArray(inlineStats) && inlineStats.length > 0 && (
              <motion.dl variants={item} className="mb-10 flex flex-wrap gap-x-20 gap-y-6 md:gap-x-24">
                {inlineStats.map((stat, i) => (
                  <div key={i}>
                    <dt className="text-3xl font-bold leading-none text-foreground md:text-4xl">
                      <CountUp to={stat.value ?? 0} />
                      {stat.suffix && (
                        <span aria-hidden className="ml-0.5">
                          {stat.suffix}
                        </span>
                      )}
                    </dt>
                    <dd className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </dd>
                  </div>
                ))}
              </motion.dl>
            )}

            <motion.div variants={item} className="flex flex-wrap items-center gap-3">
              {ctaLinks.map((link, i) =>
                link.type === 'video' ? (
                  link.video ? (
                    <VideoPopup
                      key={i}
                      url={link.video}
                      ariaLabel={link.label ?? undefined}
                      className={CTA_BUTTON_CLASS}
                      trigger={
                        <>
                          <IconPlayerPlayFilled size={16} />
                          {link.label}
                        </>
                      }
                    />
                  ) : null
                ) : (
                  <CtaLinkButton key={i} link={link} />
                ),
              )}
              <ShareWidget
                shareText={brandHeading ?? ''}
                enabledPlatforms={share?.enabledPlatforms as SharePlatformKey[] | undefined}
                qrLogo={qrLogoUrl}
              />
            </motion.div>
          </motion.div>

          {/* Mascot — mouse parallax + idle float, gradient halo behind */}
          <div className="relative flex items-center justify-center lg:col-span-5">
            {/* Animated gradient blur halo behind mascot */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                className="aspect-square w-full max-w-65 rounded-full md:max-w-xs lg:max-w-sm"
                style={{
                  background:
                    'conic-gradient(from 0deg, #38BDF8 0%, #006FEE 25%, #6366F1 50%, #0EA5E9 75%, #38BDF8 100%)',
                  filter: 'blur(64px)',
                  opacity: 0.55,
                }}
                animate={
                  reduced
                    ? undefined
                    : { rotate: 360, scale: [0.95, 1.08, 0.95] }
                }
                transition={
                  reduced
                    ? undefined
                    : {
                        rotate: { duration: 24, repeat: Infinity, ease: 'linear' },
                        scale: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
                      }
                }
              />
            </div>

            {mascot && typeof mascot === 'object' && (
              <motion.div
                className="relative w-full max-w-65 md:max-w-xs lg:max-w-sm"
                style={{
                  x: reduced ? 0 : mascotX,
                  y: reduced ? 0 : mascotY,
                  rotate: reduced ? 0 : mascotRotate,
                }}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
              >
                <motion.div
                  animate={reduced ? undefined : { y: [0, -12, 0] }}
                  transition={
                    reduced
                      ? undefined
                      : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  {/* Wrapper: w-full max-w-65 md:max-w-xs lg:max-w-sm = 260/320/384px.
                      Measured 384px on production at a 1707px viewport. */}
                  <Media
                    resource={mascot}
                    imgClassName="w-full h-auto select-none drop-shadow-xl"
                    priority
                    size="(max-width: 768px) 260px, (max-width: 1024px) 320px, 384px"
                  />
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
