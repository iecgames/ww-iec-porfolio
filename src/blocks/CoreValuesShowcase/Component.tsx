'use client'

import {
  IconArrowRight,
  IconBolt,
  IconCoffee,
  IconDeviceGamepad2Filled,
  IconDiamondFilled,
  IconEye,
  IconFlame,
  IconHeartFilled,
  IconMoonStars,
  IconPalette,
  IconRocket,
  IconShield,
  IconSparkles,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUsers,
  IconZzz,
  type IconProps,
} from '@tabler/icons-react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Link } from '@/i18n/navigation'
import React, { useEffect, useRef, useState } from 'react'

import type { Media as MediaType, CoreValuesShowcaseBlock as Props } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { SectionBackground } from '@/components/SectionBackground'

/* ── Icons ──────────────────────────────────────────── */

type IconName =
  | 'sparkles'
  | 'diamond'
  | 'sleep'
  | 'gamepad'
  | 'heart'
  | 'star'
  | 'users'
  | 'shield'
  | 'trophy'
  | 'bolt'
  | 'target'
  | 'palette'
  | 'rocket'
  | 'eye'
  | 'flame'
  | 'coffee'

const iconMap: Record<IconName, React.ComponentType<IconProps>> = {
  sparkles: IconSparkles,
  diamond: IconDiamondFilled,
  sleep: IconZzz,
  gamepad: IconDeviceGamepad2Filled,
  heart: IconHeartFilled,
  star: IconStar,
  users: IconUsers,
  shield: IconShield,
  trophy: IconTrophy,
  bolt: IconBolt,
  target: IconTarget,
  palette: IconPalette,
  rocket: IconRocket,
  eye: IconEye,
  flame: IconFlame,
  coffee: IconCoffee,
}
const iconAltMap: Partial<Record<IconName, React.ComponentType<IconProps>>> = {
  sleep: IconMoonStars,
}

const Icon: React.FC<{ name?: string | null; className?: string; stroke?: number }> = ({
  name,
  className,
  stroke = 2,
}) => {
  const key = (name as IconName) || 'sparkles'
  const Cmp = iconAltMap[key] ?? iconMap[key] ?? IconSparkles
  return <Cmp className={className} stroke={stroke} />
}

/* ── Link helper ─────────────────────────────────────── */

type CtaLink = NonNullable<NonNullable<Props['cta']>[number]>['link']

function resolveLinkHref(link: CtaLink): string {
  if (
    link.type === 'reference' &&
    typeof link.reference?.value === 'object' &&
    link.reference.value &&
    'slug' in link.reference.value
  ) {
    const slug = link.reference.value.slug
    return link.reference.relationTo === 'pages'
      ? `/${slug}`
      : `/${link.reference.relationTo}/${slug}`
  }
  if (link.type === 'route') return link.route ?? '#'
  return link.url ?? '#'
}

function renderHeading(text: string) {
  return text.split(/(&)/).map((part, i) =>
    part === '&' ? (
      <span key={i} className="text-primary">
        &amp;
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  )
}

/* ── Constellation card positions ───────────────────── */

/** Predefined absolute positions & initial tilts for up to 6 cards in the
 *  scattered constellation layout (desktop Phase 2). */
const CARD_POSITIONS: Array<{ style: React.CSSProperties; rotate: number }> = [
  { style: { left: '5%', top: '12%', width: '22rem' }, rotate: -5 }, // 0 left-top
  { style: { left: '2%', bottom: '12%', width: '22rem' }, rotate: -3 }, // 1 left-bottom
  { style: { right: '5%', top: '16%', width: '22rem' }, rotate: 4 }, // 2 right-top
  { style: { right: '2%', bottom: '12%', width: '22rem' }, rotate: 6 }, // 3 right-bottom
  { style: { left: '20%', bottom: '2%', width: '20rem' }, rotate: -2 }, // 4 overflow
  { style: { right: '20%', bottom: '2%', width: '20rem' }, rotate: 3 }, // 5 overflow
]

/* ── Value card ─────────────────────────────────────── */

type ValueItem = NonNullable<Props['values']>[number]

const ValueCard: React.FC<{
  value: ValueItem
  animOpacity: MotionValue<number>
  animY: MotionValue<number>
  /** Initial tilt angle (deg). On hover the card springs to 0. */
  rotateInit?: number
  /** When provided, card is absolutely positioned using these CSS values. */
  positionStyle?: React.CSSProperties
}> = ({ value, animOpacity, animY, rotateInit = 0, positionStyle }) => {
  const [expanded, setExpanded] = useState(false)
  const image = value.image && typeof value.image === 'object' ? (value.image as MediaType) : null

  return (
    <motion.li
      className={
        positionStyle ? 'absolute list-none pointer-events-auto hover:z-50' : 'w-full list-none'
      }
      style={{ opacity: animOpacity, y: animY, ...positionStyle }}
      initial={{ rotate: rotateInit }}
      animate={{ rotate: rotateInit }}
      whileHover={{ rotate: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
    >
      <div className="group overflow-hidden rounded-2xl bg-white/88 p-5 shadow-[0_12px_32px_-12px_rgba(0,111,238,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_-12px_rgba(0,111,238,0.42)] dark:bg-slate-900/75">
        {/* Icon + title row */}
        <div className="flex items-center gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_20px_-4px_rgba(0,111,238,0.55)] transition-transform duration-300 group-hover:scale-110">
            <Icon name={value.icon} className="size-6" stroke={2} />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <p className="shrink-0 text-sm font-extrabold uppercase tracking-wider text-primary">
              {value.title}
            </p>
            <div className="h-px flex-1 rounded-full bg-primary/25" />
          </div>
        </div>

        {/* Description */}
        {value.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
        )}

        {/* Expandable image section */}
        <AnimatePresence>
          {expanded && image && (
            <motion.div
              key="img"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
                {/* Fills a value card, which sits about half the grid on desktop. */}
                <Media
                  resource={image}
                  imgClassName="block h-auto w-full select-none"
                  size="(max-width: 768px) 100vw, 45vw"
                />
              </div>
              {value.imageCaption && (
                <p className="mt-3 text-center text-base font-semibold leading-snug text-foreground/80">
                  {value.imageCaption}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}

/* ── Main block ─────────────────────────────────────── */

export const CoreValuesShowcaseBlock: React.FC<Props> = ({
  eyebrow,
  eyebrowIcon,
  heading,
  body,
  features,
  vision,
  mission,
  mascot,
  valuesEyebrow,
  valuesDescription,
  values,
  cta,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.5 })

  // Phase 1 (VM) → fades out at 0.15–0.45
  const phase1Opacity = useTransform(progress, [0.15, 0.45], [1, 0])
  const phase1Y = useTransform(progress, [0.15, 0.45], [0, -60])
  const phase1Filter = useTransform(progress, [0.15, 0.45], ['blur(0px)', 'blur(8px)'])
  const phase1Pointer = useTransform(phase1Opacity, (v) => (v > 0.5 ? 'auto' : 'none'))

  // Phase 2 (constellation) → fades in at 0.35–0.55
  const phase2Opacity = useTransform(progress, [0.35, 0.55], [0, 1])
  const phase2Pointer = useTransform(phase2Opacity, (v) => (v > 0.5 ? 'auto' : 'none'))

  // Mascot zoom + horizontal drift — single unified entity across both phases
  const mascotScale = useTransform(progress, [0.1, 0.55], [0.45, 1])
  // Drifts from Phase 1 right-column position toward center as Phase 2 arrives
  const mascotX = useTransform(progress, [0, 0.5], [130, 0])

  // Per-value staggered entrance — pre-declared for max 6 values (hooks rule)
  const v0o = useTransform(progress, [0.45, 0.6], [0, 1])
  const v0y = useTransform(progress, [0.45, 0.6], [28, 0])
  const v1o = useTransform(progress, [0.5, 0.65], [0, 1])
  const v1y = useTransform(progress, [0.5, 0.65], [28, 0])
  const v2o = useTransform(progress, [0.55, 0.7], [0, 1])
  const v2y = useTransform(progress, [0.55, 0.7], [28, 0])
  const v3o = useTransform(progress, [0.57, 0.72], [0, 1])
  const v3y = useTransform(progress, [0.57, 0.72], [28, 0])
  const v4o = useTransform(progress, [0.62, 0.77], [0, 1])
  const v4y = useTransform(progress, [0.62, 0.77], [28, 0])
  const v5o = useTransform(progress, [0.67, 0.82], [0, 1])
  const v5y = useTransform(progress, [0.67, 0.82], [28, 0])

  const valueAnims = [
    { animOpacity: v0o, animY: v0y },
    { animOpacity: v1o, animY: v1y },
    { animOpacity: v2o, animY: v2y },
    { animOpacity: v3o, animY: v3y },
    { animOpacity: v4o, animY: v4y },
    { animOpacity: v5o, animY: v5y },
  ]

  const primaryLink = cta?.[0]?.link
  const valuesList = values ?? []
  const half = Math.ceil(valuesList.length / 2)
  const leftValues = valuesList.slice(0, half)
  const rightValues = valuesList.slice(half)

  const hasMascot = mascot && typeof mascot === 'object'

  const isMobile = !isDesktop || !!reduced

  /* ── Single root — ref always attached so useScroll hydrates correctly ── */
  return (
    <div ref={containerRef} className={isMobile ? 'relative' : 'relative h-[300vh]'}>
      {isMobile ? (
        <div className="relative">
          {/* Phase 1 — VM layout */}
          <section className="relative flex min-h-screen items-center overflow-hidden bg-linear-to-b from-sky-50/60 via-background to-background py-20 lg:py-28">
            <SectionBackground />
            <div className="container relative w-full">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-5">
                  <VMLeftContent {...{ eyebrow, eyebrowIcon, heading, body, features, cta }} />
                </div>
                <div className="grid grid-cols-1 items-center gap-6 lg:col-span-7 lg:grid-cols-7 lg:gap-8">
                  <VMRightContent {...{ mascot, vision, mission }} />
                </div>
              </div>
            </div>
          </section>

          {/* Phase 2 — values grid */}
          {valuesList.length > 0 && (
            <section className="relative overflow-hidden bg-linear-to-b from-background via-sky-50/40 to-background py-20 lg:py-28">
              <SectionBackground />
              <div className="container relative">
                {valuesEyebrow && (
                  <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    {valuesEyebrow}
                  </p>
                )}
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {valuesList.map((v, i) => (
                    <ValueCard key={v.id ?? i} value={v} animOpacity={v0o} animY={v0y} />
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      ) : (
        <>
          <div className="sticky top-0 h-screen overflow-hidden">
            <section className="relative flex h-full items-center bg-linear-to-b from-sky-50/60 via-background to-background">
              <SectionBackground />

              <div className="container relative h-full w-full">
                {/* ── PHASE 1: Vision & Mission layout ── */}
                <motion.div
                  className="pointer-events-none absolute inset-0 flex items-center"
                  style={{
                    opacity: phase1Opacity,
                    y: phase1Y,
                    filter: phase1Filter,
                    pointerEvents: phase1Pointer,
                  }}
                >
                  <div className="grid w-full grid-cols-12 items-center gap-8">
                    <div className="col-span-5">
                      <VMLeftContent {...{ eyebrow, eyebrowIcon, heading, body, features, cta }} />
                    </div>
                    <div className="col-span-7 grid grid-cols-7 items-center gap-8">
                      <VMRightContent {...{ mascot, vision, mission }} />
                    </div>
                  </div>
                </motion.div>

                {/* ── PHASE 2: Constellation ── */}
                <motion.div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                  style={{
                    opacity: phase2Opacity,
                    pointerEvents: phase2Pointer,
                  }}
                >
                  {/* Heading — fixed at top center */}
                  {valuesEyebrow && (
                    <div className="absolute inset-x-0 top-8 flex flex-col items-center gap-1.5">
                      <h2
                        className="bg-clip-text text-5xl font-black uppercase tracking-[0.18em] text-transparent drop-shadow-sm md:text-6xl"
                        style={{
                          backgroundImage:
                            'linear-gradient(120deg, #0055d4 0%, #006FEE 35%, #38BDF8 70%, #0EA5E9 100%)',
                        }}
                      >
                        {valuesEyebrow}
                      </h2>
                      {valuesDescription && (
                        <p className="text-sm font-medium text-muted-foreground/80 md:text-base">
                          {valuesDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Constellation: cards scattered around — mascot is the separate floating layer */}
                  <div className="relative flex h-120 w-full items-center justify-center xl:h-130">
                    {/* Phase 2 glow orbs — centered atmosphere */}
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="size-140 rounded-full bg-primary/10 blur-3xl" />
                    </motion.div>
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.55, 0.2] }}
                      transition={{
                        duration: 3.5,
                        delay: 0.8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <div className="size-96 rounded-full bg-sky-300/20 blur-2xl" />
                    </motion.div>

                    {/* Scattered cards — individually positioned around mascot */}
                    {valuesList.length > 0 && (
                      <ul className="pointer-events-none absolute inset-0">
                        {valuesList.map((v, i) => {
                          const pos = CARD_POSITIONS[i]
                          if (!pos) return null
                          return (
                            <ValueCard
                              key={v.id ?? i}
                              value={v}
                              animOpacity={valueAnims[i].animOpacity}
                              animY={valueAnims[i].animY}
                              rotateInit={pos.rotate}
                              positionStyle={pos.style}
                            />
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </motion.div>

                {/* ── Single mascot entity — outside phase1 blur & phase2 fade wrappers ──
                     Scales from small (Phase 1 right-col) to large (Phase 2 center)
                     via mascotScale + mascotX. Never blurred. */}
                {hasMascot && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <motion.div style={{ scale: mascotScale, x: mascotX }}>
                      <motion.div
                        className="drop-shadow-2xl"
                        animate={{ y: [0, -14, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {/* w-[34rem] xl:w-[42rem] 2xl:w-[48rem] = 544/672/768px. */}
                        <Media
                          resource={mascot}
                          imgClassName="h-auto w-[34rem] select-none xl:w-[42rem] 2xl:w-[48rem]"
                          size="(max-width: 1280px) 544px, (max-width: 1536px) 672px, 768px"
                        />
                      </motion.div>
                    </motion.div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Phase 1 sub-components ─────────────────────────── */

type VMLeftProps = Pick<Props, 'eyebrow' | 'eyebrowIcon' | 'heading' | 'body' | 'features' | 'cta'>

function VMLeftContent({ eyebrow, eyebrowIcon, heading, body, features, cta }: VMLeftProps) {
  const primaryLink = cta?.[0]?.link

  function renderH(text: string) {
    return text.split(/(&)/).map((part, i) =>
      part === '&' ? (
        <span key={i} className="text-primary">
          &amp;
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )
  }

  return (
    <>
      {eyebrow && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon name={eyebrowIcon} className="size-3" />
          </span>
          <span>{eyebrow}</span>
        </div>
      )}

      {heading && (
        <h2 className="text-4xl font-black uppercase leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-6xl">
          {renderH(heading)}
        </h2>
      )}

      <div className="mt-6 h-1 w-16 rounded-full bg-primary" />

      {body && (
        <div className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          <RichText data={body} enableGutter={false} />
        </div>
      )}

      {Array.isArray(features) && features.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <li key={f.id ?? i} className="flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_20px_-8px_rgba(0,111,238,0.35)] ring-1 ring-primary/10">
                <Icon name={f.icon} className="size-5 text-primary" stroke={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  {f.title}
                </p>
                {f.description && (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{f.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {primaryLink && (
        <div className="mt-10">
          <Link
            href={resolveLinkHref(primaryLink)}
            target={primaryLink.newTab ? '_blank' : undefined}
            rel={primaryLink.newTab ? 'noreferrer' : undefined}
            className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_-10px_rgba(0,111,238,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-10px_rgba(0,111,238,0.65)]"
          >
            <span>{primaryLink.label}</span>
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/95 text-primary transition-transform duration-300 group-hover:translate-x-1">
              <IconArrowRight className="size-4" stroke={2.5} />
            </span>
          </Link>
        </div>
      )}
    </>
  )
}

type VMRightProps = Pick<Props, 'mascot' | 'vision' | 'mission'>

function VMRightContent({ mascot, vision, mission }: VMRightProps) {
  const hasMascot = mascot && typeof mascot === 'object'
  return (
    <>
      {/* Mascot col */}
      <div className="relative flex min-h-80 items-center justify-center lg:col-span-4">
        {/* Glow primary */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.95, 0.55] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        </motion.div>
        {/* Glow secondary */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 3.5, delay: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-56 w-56 rounded-full bg-sky-300/35 blur-2xl" />
        </motion.div>

        {/* (mascot rendered as a single floating entity outside phase wrappers) */}
      </div>

      {/* Vision + Mission cards */}
      <div className="flex flex-col gap-6 lg:col-span-3">
        {vision && (
          <motion.div
            className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_50px_-20px_rgba(0,111,238,0.35)] backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_20px_-6px_rgba(0,111,238,0.55)]">
                <Icon name="eye" className="size-5" stroke={2.2} />
              </span>
              <div className="flex items-center gap-3">
                <p className="text-base font-extrabold uppercase tracking-wider text-primary">
                  Vision
                </p>
                <span className="h-px w-8 bg-primary/40" />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">{vision}</p>
          </motion.div>
        )}

        {mission && (
          <motion.div
            className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_50px_-20px_rgba(0,111,238,0.35)] backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_20px_-6px_rgba(0,111,238,0.55)]">
                <Icon name="rocket" className="size-5" stroke={2.2} />
              </span>
              <div className="flex items-center gap-3">
                <p className="text-base font-extrabold uppercase tracking-wider text-primary">
                  Mission
                </p>
                <span className="h-px w-8 bg-primary/40" />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">{mission}</p>
          </motion.div>
        )}
      </div>
    </>
  )
}
