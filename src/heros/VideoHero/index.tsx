'use client'

import { RippleLink } from '@/components/RippleLink'
import type { Page } from '@/payload-types'
import { useTransparentHeader } from '@/providers/TransparentHeader'
import { resolveLinkHref } from '@/utilities/resolveLinkHref'
import { cn } from '@/utilities/ui'
import { IconArrowRight } from '@tabler/icons-react'
import { motion, type Variants } from 'framer-motion'
import { Link } from '@/i18n/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { RenderVideoHeroBlocks } from './RenderVideoHeroBlocks'

type VideoHeroProps = NonNullable<Page['hero'] & { type: 'videoHero' }>

/** Brand-blue gradient used for the hero CTA ripple. */
const HERO_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)'

/** True on phone-sized viewports (below Tailwind `md`). Drives the card-vs-background swap. */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isMobile
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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { setTransparent } = useTransparentHeader()
  const isMobile = useIsMobile()

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

  const primaryHref = resolveLinkHref(primaryButton)
  const secondaryHref = resolveLinkHref(secondaryButton)

  const hasButtons = primaryButtonLabel || secondaryButtonLabel

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
    <div
      className={cn(
        'relative w-full overflow-hidden isolate',
        // Desktop kéo hero lên dưới header trong suốt (full-bleed video).
        // Mobile: KHÔNG kéo lên — để nội dung nằm dưới header, tránh đè chữ.
        isMobile ? 'min-h-screen -mt-28' : 'h-screen min-h-screen -mt-50',
      )}
      data-theme="dark"
    >
      {/* Desktop (md+): full-bleed background video + readability overlays.
          Mobile gets a video card instead (rendered inside the content column). */}
      {!isMobile && (
        <>
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

          {/* ── Shared gradient overlay (fades + brand diagonal) ── */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: [
                // ⓪ Top fade → trắng để header bar nổi bật trên video
                'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 5%, rgba(255,255,255,0.25) 10%, transparent 20%)',
                // ① Bottom fade → white (chuyển tiếp sang section tiếp theo)
                'linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.7) 78%, rgba(255,255,255,1) 100%)',
                // ② Sky-blue diagonal highlight từ góc trên-trái
                'linear-gradient(60deg, rgba(37,99,235,0.5) 0%, rgba(56,189,248,0.08) 35%, transparent 60%)',
              ].join(', '),
            }}
          />

          {/* ── Readability panel: left→right white fade + tint màu brand ── */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: [
                // Tint hồng phủ nhẹ lên vùng chữ → pastel, tạo chiều sâu
                'radial-gradient(ellipse 55% 45% at 14% 20%, rgba(236,72,153,0.16) 0%, transparent 60%)',
                // Nền trắng đảm bảo chữ tối luôn tương phản
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
        </>
      )}

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

          {/* ── Mobile: video dạng card (thay cho background video) ── */}
          {isMobile && (videoSource === 'upload' ? uploadedVideoUrl : youtubeId) && (
            <motion.div
              className="mt-12 w-full"
              initial={{ opacity: 0, y: 50, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: buttonsDelay + 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-500/60 bg-slate-100 shadow-[0_25px_60px_-15px_rgba(37,99,235,0.45)]">
                  {videoSource === 'upload' && uploadedVideoUrl && (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    >
                      <source src={uploadedVideoUrl} />
                    </video>
                  )}
                  {videoSource === 'youtube' && youtubeId && (
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&rel=0&disablekb=1&playlist=${youtubeId}`}
                      allow="autoplay; encrypted-media"
                      title="Intro video"
                    />
                  )}
                  {/* Sheen chéo cho cảm giác card bóng, nổi khối */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 42%)',
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
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
          {hasButtons && (
            <motion.div
              className="flex flex-col items-start gap-3 mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: buttonsDelay, ease: 'easeOut' }}
            >
              {primaryButtonLabel && (
                <RippleLink
                  href={primaryHref?.href ?? '#'}
                  label={primaryButtonLabel}
                  variant="solid"
                  gradient={HERO_GRADIENT}
                  external={primaryHref?.external}
                  newTab={primaryButton?.newTab}
                />
              )}

              {secondaryButtonLabel &&
                (() => {
                  const secondaryClass =
                    'ml-3 group inline-flex items-center gap-1.5 text-sm md:text-base font-semibold text-slate-900'
                  const target = secondaryButton?.newTab ? '_blank' : undefined
                  const rel = secondaryButton?.newTab ? 'noopener noreferrer' : undefined
                  const href = secondaryHref?.href ?? '#'

                  const content = (
                    <>
                      <span className="bg-[linear-gradient(90deg,#2563EB_0%,#38BDF8_100%)] bg-clip-text transition-colors duration-300 group-hover:text-transparent">
                        {secondaryButtonLabel}
                      </span>
                      <motion.span
                        aria-hidden
                        className="inline-flex text-slate-900 transition-colors duration-300 group-hover:text-[#2563EB]"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <IconArrowRight className="size-4" stroke={2.4} />
                      </motion.span>
                    </>
                  )

                  return secondaryHref?.external ? (
                    <a href={href} target={target} rel={rel} className={secondaryClass}>
                      {content}
                    </a>
                  ) : (
                    <Link href={href} target={target} rel={rel} className={secondaryClass}>
                      {content}
                    </Link>
                  )
                })()}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
