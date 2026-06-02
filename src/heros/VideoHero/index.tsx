'use client'

import type { Page } from '@/payload-types'
import { useTransparentHeader } from '@/providers/TransparentHeader'
import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { RenderVideoHeroBlocks } from './RenderVideoHeroBlocks'

type VideoHeroProps = NonNullable<Page['hero'] & { type: 'videoHero' }>

type ButtonLink = NonNullable<VideoHeroProps['primaryButton']>

/** Resolve a hero button link group into an href + whether it's external. */
function resolveButtonHref(link?: ButtonLink | null): { href: string; external: boolean } | null {
  if (!link) return null
  if (link.type === 'section' && link.section) {
    return { href: link.section, external: false }
  }
  if (link.type === 'custom' && link.url) {
    const external = /^https?:\/\//i.test(link.url)
    return { href: link.url, external }
  }
  if (link.type === 'reference' && link.reference && typeof link.reference.value === 'object') {
    const { relationTo, value } = link.reference
    if (value?.slug) {
      return { href: `${relationTo === 'posts' ? '/posts' : ''}/${value.slug}`, external: false }
    }
  }
  return null
}

/** Renders an internal/section link via next/link, external links via a plain anchor. */
function HeroLink({
  resolved,
  newTab,
  className,
  style,
  children,
}: {
  resolved: { href: string; external: boolean } | null
  newTab?: boolean | null
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const href = resolved?.href ?? '#'
  const target = newTab ? '_blank' : undefined
  const rel = newTab ? 'noopener noreferrer' : undefined

  if (!resolved || resolved.external) {
    return (
      <a href={href} target={target} rel={rel} className={className} style={style}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} target={target} rel={rel} className={className} style={style}>
      {children}
    </Link>
  )
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
    /youtube\.com\/shorts\/([^&?/]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

const charVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
}

/**
 * Tách heading thành phần thường (`rest`) và phần được highlight (`highlight`).
 *
 * Phần nằm giữa cặp dấu `\\ ... \\` sẽ là phần highlight (gradient, cỡ chữ lớn).
 * Ví dụ: "Join us \\IEC Game - Winter Wolf\\"
 *   → rest = "Join us", highlight = "IEC Game - Winter Wolf"
 *
 * Nếu không có dấu `\\`, fallback về hành vi cũ: highlight từ cuối cùng.
 */
function parseHeading(text: string): { rest: string; highlight: string } {
  const match = text.match(/\\+\s*([^\\]+?)\s*\\+/)
  if (match) {
    return {
      rest: text.slice(0, match.index).trim(),
      highlight: match[1].trim(),
    }
  }
  // Fallback: highlight từ cuối cùng
  const words = text.trim().split(/\s+/)
  return {
    rest: words.slice(0, -1).join(' '),
    highlight: words[words.length - 1] ?? '',
  }
}

/** Typewriter effect: characters appear one by one */
function TypewriterText({
  text,
  className,
  style,
  stagger,
  startDelay = 0,
}: {
  text: string
  className?: string
  style?: React.CSSProperties
  stagger: number
  startDelay?: number
}) {
  const chars = text.split('')
  return (
    <motion.span
      className={className}
      style={style}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: startDelay } },
      }}
    >
      {chars.map((char, i) => (
        <motion.span key={i} variants={charVariants} className="inline-block whitespace-pre">
          {char}
        </motion.span>
      ))}
    </motion.span>
  )
}

/** Split heading — phần `rest` typewrite trước, rồi tới phần highlight (gradient) đặt giữa `\\ ... \\` */
function HeadingWithGradient({ text }: { text: string }) {
  const { rest, highlight } = parseHeading(text)

  // stagger per character: 0.055s → feels deliberate but not too slow
  const charStagger = 0.055
  const restCharCount = rest.length + 1 // +1 for the space/br pause
  const highlightStartDelay = restCharCount * charStagger + 0.15

  return (
    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[1.05] tracking-tight uppercase mb-4">
      {rest && (
        <>
          <TypewriterText text={rest} stagger={charStagger} startDelay={0.25} />
          <br />
        </>
      )}
      <TypewriterText
        text={highlight + '.'}
        stagger={charStagger}
        startDelay={rest ? highlightStartDelay + 0.25 : 0.25}
        className="bg-clip-text text-transparent text-6xl md:text-7xl lg:text-8xl"
        style={{ backgroundImage: 'linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)' }}
      />
    </h1>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export const VideoHero: React.FC<VideoHeroProps> = ({
  videoSource,
  videoFile,
  youtubeUrl,
  heading,
  subtitle,
  overlayContent,
  primaryButtonLabel,
  primaryButton,
  secondaryButtonLabel,
  secondaryButton,
  videoPopupUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const { setTransparent } = useTransparentHeader()

  useEffect(() => {
    setTransparent(true)
    return () => setTransparent(false)
  }, [setTransparent])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const youtubeId = videoSource === 'youtube' && youtubeUrl ? extractYouTubeId(youtubeUrl) : null
  const uploadedVideoUrl =
    videoSource === 'upload' &&
    videoFile &&
    typeof videoFile === 'object' &&
    'url' in videoFile &&
    videoFile.url
      ? videoFile.url
      : null

  const popupYoutubeId = videoPopupUrl ? extractYouTubeId(videoPopupUrl) : null
  const popupEmbedUrl = popupYoutubeId
    ? `https://www.youtube.com/embed/${popupYoutubeId}?autoplay=1`
    : (videoPopupUrl ?? null)

  const primaryHref = resolveButtonHref(primaryButton)
  const secondaryHref = resolveButtonHref(secondaryButton)

  const hasButtons = primaryButtonLabel || secondaryButtonLabel
  const hasPopupBtn = !!videoPopupUrl

  // Calculate delays so each element animates after the previous finishes
  const charStagger = 0.055
  const { rest: headingRest, highlight: headingHighlight } = heading
    ? parseHeading(heading)
    : { rest: '', highlight: '' }
  const restEndTime = 0.25 + headingRest.length * charStagger
  const lastEndTime =
    (headingRest ? restEndTime + 0.4 : 0.25) + headingHighlight.length * charStagger
  const subtitleDelay = lastEndTime + 0.35
  const blocksDelay = subtitleDelay + 0.65
  const buttonsDelay = blocksDelay + 0.5

  return (
    <>
      <div
        className="relative w-full h-screen min-h-screen overflow-hidden -mt-50 isolate"
        data-theme="dark"
      >
        {/* ── Video background ── */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {videoSource === 'upload' && uploadedVideoUrl && (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={uploadedVideoUrl} />
            </video>
          )}

          {videoSource === 'youtube' && youtubeId && (
            <iframe
              className="absolute top-1/2 left-1/2 w-[177.77777778vh] h-[56.25vw] min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&rel=0&disablekb=1&vq=hd1080`}
              allow="autoplay; encrypted-media"
              title="Background video"
            />
          )}
        </div>

        {/* ── Blue gradient overlay (left → transparent) ── */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: [
              // ⓪ Top fade → trắng để header bar nổi bật trên video
              'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 5%, rgba(255,255,255,0.25) 10%, transparent 20%)',
              // ① Bottom fade → white (chuyển tiếp sang section tiếp theo)
              'linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.7) 78%, rgba(255,255,255,1) 100%)',
              // ② Sky-blue diagonal highlight từ góc trên-trái
              //   'linear-gradient(60deg, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0.08) 35%, transparent 60%)',
              'linear-gradient(60deg, rgba(37,99,235,0.5) 0%, rgba(56,189,248,0.08) 35%, transparent 60%)',
              // ③ White panel bên trái cho text đọc được
              'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.93) 28%, rgba(255,255,255,0.1) 62%, transparent 80%)',
            ].join(', '),
          }}
        />

        {/* ── Dot-grid (halftone) overlay ── */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(15,23,42,0.25) 0.4px, transparent 0.8px)',
            backgroundSize: '5px 5px',
            // Mờ dần ở mép trái (vùng text) và mép dưới (chỗ fade sang section sau)
            maskImage:
              'linear-gradient(to right, transparent 6%, black 34%), linear-gradient(to bottom, black 62%, transparent 90%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 6%, black 34%), linear-gradient(to bottom, black 62%, transparent 90%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in',
            mixBlendMode: 'multiply',
            opacity: 0.45,
          }}
        />

        {/* ── Content ── */}
        <div className="relative z-20 h-full flex items-center">
          <div className="w-full md:w-2/3 lg:w-[58%] pl-8 md:pl-16 lg:pl-24 pr-6 py-16 flex flex-col justify-center">
            {heading && <HeadingWithGradient text={heading} />}

            {subtitle && (
              <motion.p
                className="text-sm md:text-base text-gray-600 mb-6 leading-relaxed max-w-md"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: subtitleDelay, ease: 'easeOut' }}
              >
                {subtitle}
              </motion.p>
            )}

            {overlayContent && Array.isArray(overlayContent) && overlayContent.length > 0 && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: blocksDelay, ease: 'easeOut' }}
              >
                <RenderVideoHeroBlocks blocks={overlayContent} />
              </motion.div>
            )}

            {/* ── Buttons row ── */}
            {(hasButtons || hasPopupBtn) && (
              <motion.div
                className="flex flex-wrap items-center gap-3 mt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: buttonsDelay, ease: 'easeOut' }}
              >
                {primaryButtonLabel && (
                  <HeroLink
                    resolved={primaryHref}
                    newTab={primaryButton?.newTab}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
                  >
                    {primaryButtonLabel}
                  </HeroLink>
                )}

                {secondaryButtonLabel && (
                  <HeroLink
                    resolved={secondaryHref}
                    newTab={secondaryButton?.newTab}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold border-2 border-blue-600 text-blue-700 bg-transparent transition-colors hover:bg-blue-50"
                  >
                    {secondaryButtonLabel}
                  </HeroLink>
                )}

                {hasPopupBtn && (
                  <button
                    onClick={() => setPopupOpen(true)}
                    aria-label="Watch video"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors">
                      <PlayIcon />
                    </span>
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Video popup modal ── */}
      {popupOpen && popupEmbedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPopupOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl mx-4 aspect-video rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              className="absolute inset-0 w-full h-full"
              src={popupEmbedUrl}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title="Video popup"
            />
            <button
              onClick={() => setPopupOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
              aria-label="Close video"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4"
              >
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
