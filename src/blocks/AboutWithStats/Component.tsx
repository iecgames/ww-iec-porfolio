'use client'

import { IconArrowUpRight, IconPlayerPlay } from '@tabler/icons-react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from 'framer-motion'
import { Link } from '@/i18n/navigation'
import React, { useEffect, useRef } from 'react'

import type { Media as MediaType, AboutWithStatsBlock as Props } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

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

type CtaLink = NonNullable<NonNullable<Props['cta']>[number]>['link']

function resolveLinkHref(link: CtaLink) {
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

/* ----------------------------- CountUp -------------------------------- */

function inferDecimals(n: number): number {
  if (Number.isInteger(n)) return 0
  const parts = String(n).split('.')
  return Math.min(parts[1]?.length ?? 0, 2)
}

const CountUp: React.FC<{ to: number; duration?: number }> = ({ to, duration = 1.8 }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const decimals = inferDecimals(to)

  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals],
  )

  useEffect(() => {
    if (!ref.current) return
    if (reduced) {
      ref.current.textContent = formatter.format(to)
      return
    }
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: 'easeOut',
      onUpdate(v) {
        if (ref.current) ref.current.textContent = formatter.format(v)
      },
    })
    return () => controls.stop()
  }, [inView, to, duration, reduced, formatter])

  return <span ref={ref}>{formatter.format(reduced ? to : 0)}</span>
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

const statItem: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: 'easeOut' } },
}

/* ----------------------- Decoration with parallax --------------------- */

type DecorationProps = {
  dec: NonNullable<Props['decorations']>[number]
  index: number
  smoothX: MotionValue<number>
  smoothY: MotionValue<number>
  reduced: boolean | null
}

const DecorationItem: React.FC<DecorationProps> = ({ dec, index, smoothX, smoothY, reduced }) => {
  const depth = Math.max(0.4, Math.min(1.5, (dec.sizePercent ?? 8) / 10))
  const tx = useTransform(smoothX, [-1, 1], [-14 * depth, 14 * depth])
  const ty = useTransform(smoothY, [-1, 1], [-10 * depth, 10 * depth])

  if (!dec.image || typeof dec.image !== 'object') return null
  const pos = (dec.position ?? 'topRight') as DecorPosition
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
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.7, delay: 0.25 + index * 0.08, ease: 'easeOut' }}
    >
      {/* Wrapper caps at maxWidth 180px above. */}
      <Media
        resource={dec.image as MediaType}
        imgClassName="w-full h-auto opacity-90"
        size="180px"
      />
    </motion.div>
  )
}

/* --------------------------- Stat Card -------------------------------- */

type StatProps = {
  value: number
  suffix?: string | null
  label: string
}

const StatCard: React.FC<StatProps> = ({ value, suffix, label }) => {
  return (
    <motion.div variants={statItem} className="group">
      <div className="flex items-baseline gap-1 leading-none">
        <span
          className="text-7xl font-black tracking-tight md:text-8xl lg:text-[7.5rem]"
          style={{
            WebkitTextStroke: '1.5px #006FEE',
            color: 'transparent',
          }}
        >
          <CountUp to={value} />
        </span>
        {suffix && (
          <span
            className="text-5xl font-black tracking-tight md:text-6xl lg:text-7xl"
            style={{
              WebkitTextStroke: '1.5px #006FEE',
              color: 'transparent',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-sm">
        {label}
      </p>
    </motion.div>
  )
}

/* ------------------- Support Media (image or video) ------------------- */

const SupportMedia: React.FC<{ media: MediaType; reduced: boolean | null }> = ({
  media,
  reduced,
}) => {
  const isVideo = media.mimeType?.startsWith('video/')
  const [hovered, setHovered] = React.useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!isVideo || !videoRef.current) return
    if (hovered) {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [hovered, isVideo])

  return (
    <motion.div
      className="group relative -rotate-3 cursor-pointer transition-transform duration-500 ease-out hover:rotate-0 hover:scale-[1.03]"
      animate={reduced ? undefined : { y: [0, -10, 0] }}
      transition={reduced ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <div className="overflow-hidden rounded-[28px] shadow-[0_25px_50px_-12px_rgba(0,111,238,0.25),0_10px_24px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={media.url ?? ''}
              className="block aspect-4/5 w-full select-none object-cover"
              muted
              loop
              playsInline
            />
            <div
              className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity duration-300 ${hovered ? 'opacity-0' : 'opacity-100'}`}
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <IconPlayerPlay className="ml-0.5 size-6 text-slate-900" />
              </div>
            </div>
          </>
        ) : (
          /* Portrait media card, roughly half the section width on desktop. */
          <Media
            resource={media}
            imgClassName="block aspect-[4/5] w-full h-full object-cover select-none"
            size="(max-width: 768px) 100vw, 45vw"
          />
        )}
      </div>
    </motion.div>
  )
}

/* ------------------- Feature Video (right column, autoplay) ----------- */

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/\s]{11})/,
  )
  return match?.[1] ?? null
}

const FeatureVideoCard: React.FC<{ media?: MediaType; youtubeUrl?: string | null }> = ({
  media,
  youtubeUrl,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const inView = useInView(wrapRef, { margin: '-10%' })
  const [ytMounted, setYtMounted] = React.useState(false)

  const ytId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null
  const isYoutube = Boolean(ytId)
  const isVideo = !isYoutube && media?.mimeType?.startsWith('video/')

  // Lazy-mount the iframe on first in-view, then use postMessage to play/pause
  useEffect(() => {
    if (!isYoutube) return
    if (inView && !ytMounted) setYtMounted(true)
    if (ytMounted && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: inView ? 'playVideo' : 'pauseVideo', args: '' }),
        '*',
      )
    }
  }, [inView, isYoutube, ytMounted])

  // Native video play/pause on scroll
  useEffect(() => {
    if (!isVideo || !videoRef.current) return
    if (inView) {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [inView, isVideo])

  return (
    <motion.div ref={wrapRef} variants={statItem}>
      <motion.div className="-rotate-1 transition-transform duration-500 ease-out hover:rotate-0 hover:scale-[1.02]">
        <div className="overflow-hidden rounded-3xl shadow-[0_20px_45px_-12px_rgba(0,111,238,0.22),0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
          {isYoutube ? (
            ytMounted ? (
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&enablejsapi=1&rel=0&modestbranding=1`}
                className="block aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Feature video"
              />
            ) : (
              /* Thumbnail placeholder until first scroll-into-view */
              <div className="relative aspect-video w-full bg-slate-100">
                <img
                  src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )
          ) : isVideo ? (
            <video
              ref={videoRef}
              src={media!.url ?? ''}
              className="block aspect-video w-full object-cover"
              muted
              loop
              playsInline
            />
          ) : media ? (
            <Media
              resource={media}
              imgClassName="block aspect-video w-full object-cover"
              size="(max-width: 1024px) 100vw, 50vw"
            />
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------- AboutWithStatsBlock ------------------------ */

export const AboutWithStatsBlock: React.FC<Props> = ({
  marqueePhrases,
  marqueeBadge,
  eyebrow,
  heading,
  description,
  supportImage,
  featureVideoSource,
  featureVideo,
  featureVideoYoutubeUrl,
  flyingMascot,
  cta,
  stats,
  decorations,
}) => {
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const primaryLink = cta?.[0]?.link

  // Section-scoped mouse tracking → drives decoration parallax.
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 70, damping: 18, mass: 0.5 })
  const smoothY = useSpring(mouseY, { stiffness: 70, damping: 18, mass: 0.5 })

  // Scroll progress through the section → drives the flying mascot path.
  // 0 when the section's top hits the bottom of the viewport,
  // 1 when the section's bottom leaves the top of the viewport.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  // Smooth the progress so direction-changes feel like a real flight, not snapping.
  const flyProgress = useSpring(scrollYProgress, { stiffness: 55, damping: 24, mass: 0.6 })

  // Winding A→B path: enters off-screen left, climbs, dives, climbs again,
  // then dives off-screen on the right. Endpoints (t=0 and t=1) are pinned;
  // the intermediate stops are redistributed to spread two clear peaks across
  // the whole scroll range instead of bunching them at the start.
  const FLY_STOPS = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]
  const flyX = useTransform(flyProgress, FLY_STOPS, [
    '-30vw', // KEEP (entry)
    '-5vw',
    '18vw',
    '45vw',
    '70vw',
    '95vw',
    '120vw', // KEEP (exit)
  ])
  // Keep Y always positive so the mascot stays inside the section bounds
  // (section uses overflow-hidden — anything above top:0 gets clipped).
  // Range ~[6vh, 28vh] during the journey; final keyframe dives off the bottom.
  const flyY = useTransform(flyProgress, FLY_STOPS, [
    '40vh', // KEEP (entry)
    '18vh',
    '6vh', //  first peak
    '24vh', // dip through the middle
    '8vh', //  second peak
    '28vh', // descending
    '180vh', // KEEP (dive off bottom)
  ])
  // Banking / pitch — alternates with climbs/dives so the plane visibly banks.
  const flyRotate = useTransform(flyProgress, FLY_STOPS, [
    -15, // KEEP
    -10,
    -14,
    10,
    -12,
    14,
    42, // KEEP
  ])
  // Fade in just after entry, fade out just before exit.
  const flyOpacity = useTransform(flyProgress, [0, 0.05, 0.92, 1], [0, 1, 1, 0])

  // Scroll-driven horizontal marquee. The strip contains the phrase set twice,
  // so translating by -50% of its own width lands on a visually identical
  // position — meaning the strip never reveals empty space at the edges.
  const marqueeX = useTransform(flyProgress, [0, 1], ['0%', '-50%'])
  const hasMarquee = Array.isArray(marqueePhrases) && marqueePhrases.length > 0
  const marqueeBadgeMedia =
    marqueeBadge && typeof marqueeBadge === 'object' ? (marqueeBadge as MediaType) : null

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
    <section ref={sectionRef} className="relative flex min-h-screen items-center overflow-hidden">
      {/* Scroll-driven marquee strip */}
      {hasMarquee && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-2 overflow-hidden py-6 md:py-8"
        >
          <motion.div
            className="flex w-max items-center gap-10 whitespace-nowrap will-change-transform md:gap-14 lg:gap-16"
            style={{ x: reduced ? 0 : marqueeX }}
          >
            {[...marqueePhrases!, ...marqueePhrases!].map((phrase, i) => (
              <React.Fragment key={`${phrase.id ?? 'phrase'}-${i}`}>
                <span className="text-4xl font-black uppercase tracking-tight text-foreground md:text-6xl lg:text-7xl">
                  {phrase.text}
                </span>
                {marqueeBadgeMedia && (
                  <span className="block w-12 shrink-0 md:w-16 lg:w-20">
                    {/* Wrapper span is w-12 md:w-16 lg:w-20 = 48/64/80px. */}
                    <Media
                      resource={marqueeBadgeMedia}
                      imgClassName="w-full h-auto select-none"
                      size="(max-width: 768px) 48px, (max-width: 1024px) 64px, 80px"
                    />
                  </span>
                )}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      )}

      {/* Decorations */}
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

      {/* Flying mascot — scroll-driven path across the section */}
      {flyingMascot && typeof flyingMascot === 'object' && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10 w-32 select-none md:w-48 lg:w-56"
          style={{
            x: reduced ? '50vw' : flyX,
            y: reduced ? '15vh' : flyY,
            rotate: reduced ? 0 : flyRotate,
            opacity: reduced ? 0.6 : flyOpacity,
          }}
        >
          <motion.div
            animate={reduced ? undefined : { y: [0, -6, 0] }}
            transition={
              reduced ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            {/* Wrapper is w-32 md:w-48 lg:w-56 = 128/192/224px. */}
            <Media
              resource={flyingMascot as MediaType}
              imgClassName="w-full h-auto drop-shadow-xl"
              size="(max-width: 768px) 128px, (max-width: 1024px) 192px, 224px"
            />
          </motion.div>
        </motion.div>
      )}

      <motion.div
        className="container relative w-full pt-28 pb-16 md:pt-44 md:pb-20 lg:pt-48 lg:pb-24"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-15%' }}
      >
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7">
            {eyebrow && (
              <motion.span
                variants={item}
                className="mb-5 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground"
              >
                {eyebrow}
              </motion.span>
            )}

            {heading && (
              <motion.div variants={item} className="mb-10">
                <RichText
                  data={heading}
                  enableGutter={false}
                  enableProse={false}
                  className={
                    'brand-gradient-bold text-3xl font-black uppercase leading-[1.1] tracking-tight text-foreground md:text-4xl lg:text-5xl ' +
                    '[&_p]:m-0 [&_p+p]:mt-2'
                  }
                />
              </motion.div>
            )}

            <div className="flex flex-col gap-10 md:flex-row md:items-center md:gap-10 lg:gap-12">
              {supportImage && typeof supportImage === 'object' && (
                <motion.div variants={item} className="w-56 shrink-0 self-center md:w-64 lg:w-72">
                  <SupportMedia media={supportImage as MediaType} reduced={reduced} />
                </motion.div>
              )}

              <div className="flex-1">
                {description && (
                  <motion.div variants={item} className="text-foreground/75">
                    <RichText data={description} enableGutter={false} />
                  </motion.div>
                )}

                {primaryLink && (
                  <motion.div variants={item} className="mt-8">
                    <Link
                      href={resolveLinkHref(primaryLink)}
                      target={primaryLink.newTab ? '_blank' : undefined}
                      rel={primaryLink.newTab ? 'noreferrer' : undefined}
                      className="group inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary"
                    >
                      <span className="relative">
                        {primaryLink.label}
                        <span
                          aria-hidden
                          className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
                        />
                      </span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        <IconArrowUpRight size={14} stroke={2.5} />
                      </span>
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Feature video + Stats */}
          {(() => {
            const hasVideo =
              featureVideoSource === 'upload'
                ? !!featureVideo
                : featureVideoSource === 'youtube'
                  ? !!featureVideoYoutubeUrl
                  : !!(featureVideo || featureVideoYoutubeUrl)
            const resolvedMedia =
              featureVideoSource === 'youtube'
                ? undefined
                : typeof featureVideo === 'object' && featureVideo
                  ? (featureVideo as MediaType)
                  : undefined
            const resolvedYtUrl =
              featureVideoSource === 'upload' ? null : (featureVideoYoutubeUrl ?? null)
            return hasVideo || (Array.isArray(stats) && stats.length > 0) ? (
              <motion.div
                variants={container}
                className="flex flex-col gap-8 lg:col-span-5 lg:gap-10 lg:pl-8 lg:pt-4"
              >
                {hasVideo && <FeatureVideoCard media={resolvedMedia} youtubeUrl={resolvedYtUrl} />}

                {Array.isArray(stats) && stats.length > 0 && (
                  <motion.dl variants={container} className="flex flex-col gap-10 lg:gap-12">
                    {stats.map((stat, i) => (
                      <StatCard
                        key={stat.id ?? i}
                        value={stat.value ?? 0}
                        suffix={stat.suffix}
                        label={stat.label}
                      />
                    ))}
                  </motion.dl>
                )}
              </motion.div>
            ) : null
          })()}
        </div>
      </motion.div>
    </section>
  )
}
