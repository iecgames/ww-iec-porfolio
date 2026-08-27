'use client'

import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import type { Game } from '@/payload-types'

/* ─── Layout constants ─────────────────────────────── */
const CARD_W = 340 // card slot width in px
const CARD_GAP = 32 // gap between card slots
const STEP = CARD_W + CARD_GAP // distance between card centers
const DRAG_THRESHOLD = 60 // px offset required to advance

/* ─── Single card ──────────────────────────────────── */
function GameCardInner({ game, isCenter }: { game: Game; isCenter: boolean }) {
  const href = game.playUrl || (game.slug ? `/games/${game.slug}` : null)

  return (
    <article
      className={`group/card overflow-hidden rounded-2xl transition-shadow duration-300 ${
        isCenter
          ? 'bg-[#060d1e] ring-1 ring-blue-500/30 shadow-[0_28px_72px_-8px_rgba(0,90,255,0.45),0_8px_24px_rgba(0,0,0,0.5)]'
          : 'bg-[#1a2d52] ring-1 ring-blue-400/25 shadow-[0_8px_24px_rgba(0,0,0,0.45),0_2px_8px_rgba(59,130,246,0.15)]'
      }`}
    >
      {/* Cover image */}
      {game.cover && typeof game.cover === 'object' && (
        <div className="aspect-video overflow-hidden">
          {/* Carousel cards measured on production: 340px centre, 286/211px sides. */}
          <Media
            resource={game.cover}
            imgClassName={`h-full w-full object-cover transition-transform duration-500 ${
              isCenter ? 'group-hover/card:scale-105' : ''
            }`}
            size="(max-width: 768px) 70vw, 360px"
          />
        </div>
      )}

      {/* Info */}
      <div
        className={
          isCenter
            ? // Blue-tinted info panel for the centre card
              'relative border-t border-blue-500/20 bg-linear-to-b from-blue-600/70 to-blue-950/40 p-6 pb-7'
            : // Side card: tight padding + clear separator
              'border-1.5 border-t-0 rounded-b-2xl border-blue-400/20 bg-[#142040] px-4 pb-4 pt-3'
        }
      >
        {/* Blue accent line on left edge – centre only */}
        {isCenter && (
          <span
            aria-hidden
            className="absolute left-0 top-4 h-[calc(100%-2rem)] w-0.75 rounded-r-full bg-linear-to-b from-blue-400 to-blue-600/0"
          />
        )}

        {/* Badges */}
        {isCenter && Array.isArray(game.badges) && game.badges.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {game.badges.map((badge, i) => (
              <span
                key={i}
                className="rounded-full bg-blue-500/25 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blue-300"
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Side card: compact badge row */}
        {!isCenter && Array.isArray(game.badges) && game.badges.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {game.badges.slice(0, 2).map((badge, i) => (
              <span
                key={i}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/50"
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <h3
          className={`font-bold leading-tight ${
            isCenter ? 'text-2xl text-white' : 'line-clamp-2 text-lg text-white/80'
          }`}
        >
          {game.title}
        </h3>

        {/* Description – centre card only */}
        {game.description && (
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-blue-100/50">
            {game.description}
          </p>
        )}

        {/* Downloads */}
        {game.downloads && (
          <div
            className={`flex items-center gap-1.5 ${
              isCenter ? 'mt-3 text-xs text-blue-200/60' : 'mt-1.5 text-[10px] text-white/40'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={isCenter ? 'h-3.5 w-3.5 shrink-0' : 'h-3 w-3 shrink-0'}
              aria-hidden
            >
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            <span>{game.downloads}</span>
          </div>
        )}

        {/* Store buttons – centre card only */}
        {isCenter && (game.appStoreUrl || game.googlePlayUrl) && (
          <div className="mt-5 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {game.appStoreUrl && (
              <a
                href={game.appStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 ring-1 ring-white/15 transition-all duration-200 hover:ring-white/35 hover:shadow-[0_0_16px_rgba(0,0,0,0.6)]"
              >
                {/* Apple logo */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 shrink-0 text-white"
                  aria-hidden
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] text-white/60">Download on the</span>
                  <span className="text-xs font-semibold text-white">App Store</span>
                </div>
              </a>
            )}
            {game.googlePlayUrl && (
              <a
                href={game.googlePlayUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 ring-1 ring-white/15 transition-all duration-200 hover:ring-white/35 hover:shadow-[0_0_16px_rgba(0,0,0,0.6)]"
              >
                {/* Google Play logo */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 shrink-0"
                  aria-hidden
                >
                  <path
                    d="M3.18 23.76c.3.17.64.24.99.2l12.7-11.7-2.76-2.76L3.18 23.76z"
                    fill="#EA4335"
                  />
                  <path
                    d="M20.9 10.09 18.1 8.49l-3.11 2.87 3.11 3.11 2.82-1.63a1.61 1.61 0 0 0 0-2.75z"
                    fill="#FBBC04"
                  />
                  <path
                    d="M3.17.24a1.6 1.6 0 0 0-.99 1.51v20.5l10.93-10.93L3.17.24z"
                    fill="#4285F4"
                  />
                  <path
                    d="M14.11 12 3.18 1.07c-.01 0-.01-.01-.01-.01l10.93 10.2L14.11 12z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.17.24l10.94 10.93.9-.83L6.31.17A1.65 1.65 0 0 0 3.17.24z"
                    fill="#34A853"
                  />
                </svg>
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] text-white/60">GET IT ON</span>
                  <span className="text-xs font-semibold text-white">Google Play</span>
                </div>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

/* ─── Carousel ─────────────────────────────────────── */
type CarouselProps = {
  games: Game[]
  eyebrow?: string
  heading?: string | null
}

export function GamesCarousel({ games, eyebrow, heading }: CarouselProps) {
  // Default to the 2nd card (index 1) so all three cards are visible at load;
  // fall back to 0 if there is only one card.
  const [activeIdx, setActiveIdx] = useState(() => (games.length > 1 ? 1 : 0))

  // Live drag offset — applied as a dampened x-shift to the whole track for drag feel
  const dragX = useMotionValue(0)
  const trackOffset = useTransform(dragX, (v) => v * 0.35)

  const pointerStartX = useRef(0)
  const didDrag = useRef(false)
  // setPointerCapture redirects pointer events away from child elements,
  // so we store the original target here to handle card-click navigation.
  const pointerDownTarget = useRef<Element | null>(null)

  const goTo = useCallback(
    (idx: number) => setActiveIdx(Math.max(0, Math.min(idx, games.length - 1))),
    [games.length],
  )
  const prev = useCallback(() => goTo(activeIdx - 1), [activeIdx, goTo])
  const next = useCallback(() => goTo(activeIdx + 1), [activeIdx, goTo])

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [prev, next])

  /* ── Pointer handlers ── */
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerStartX.current = e.clientX
    pointerDownTarget.current = e.target as Element
    didDrag.current = false
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons !== 1) return
      const delta = e.clientX - pointerStartX.current
      if (Math.abs(delta) > 6) didDrag.current = true
      dragX.set(delta)
    },
    [dragX],
  )

  const snapDragBack = useCallback(() => {
    animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 35 })
  }, [dragX])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const delta = e.clientX - pointerStartX.current
      if (delta < -DRAG_THRESHOLD) next()
      else if (delta > DRAG_THRESHOLD) prev()
      else if (!didDrag.current) {
        // setPointerCapture makes pointerup fire on the pivot, not the child card,
        // so onClick on child motion.divs won't fire. Navigate via stored target.
        const card = pointerDownTarget.current?.closest('[data-card-idx]')
        if (card) {
          const idx = parseInt(card.getAttribute('data-card-idx') ?? '-1', 10)
          if (idx >= 0) goTo(idx)
        }
      }
      snapDragBack()
    },
    [next, prev, snapDragBack, goTo],
  )

  return (
    <div className="flex w-full flex-col items-center gap-12">
      {/* ── Header ──────────────────────────────────── */}
      {(eyebrow || heading) && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="px-4 text-center"
        >
          {eyebrow && (
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-blue-400/80">
              {eyebrow}
            </span>
          )}
          {heading && (
            <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">{heading}</h2>
          )}
        </motion.div>
      )}

      {/* ── Track ───────────────────────────────────── */}
      {/* Outer wrapper clips cards at the left/right viewport edges */}
      <div className="relative w-full overflow-hidden">
        {/* Left edge fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[12%] min-w-10"
          style={{
            background: 'linear-gradient(to right, oklch(10% 0.02 260deg) 0%, transparent 100%)',
          }}
        />
        {/* Right edge fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[12%] min-w-10"
          style={{
            background: 'linear-gradient(to left, oklch(10% 0.02 260deg) 0%, transparent 100%)',
          }}
        />

        {/* Nav arrows */}
        <button
          onClick={prev}
          disabled={activeIdx === 0}
          aria-label="Previous game"
          className="absolute left-4 top-1/2 z-30 -translate-y-1/2 hidden rounded-full bg-white/5 p-3 text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-20 active:scale-95 md:block"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          onClick={next}
          disabled={activeIdx === games.length - 1}
          aria-label="Next game"
          className="absolute right-4 top-1/2 z-30 -translate-y-1/2 hidden rounded-full bg-white/5 p-3 text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-20 active:scale-95 md:block"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/*
         * Card pivot — horizontally centered, width = CARD_W.
         * overflow:visible lets side cards extend beyond the pivot bounds;
         * the outer overflow:hidden wrapper clips them at the viewport edges.
         * x: trackOffset provides live drag-follow feedback.
         */}
        <motion.div
          className="relative mx-auto cursor-grab select-none active:cursor-grabbing mb-4"
          style={{ height: 480, width: CARD_W, x: trackOffset, overflow: 'visible' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={snapDragBack}
        >
          {games.map((game, idx) => {
            const distance = idx - activeIdx
            const abs = Math.abs(distance)
            if (abs > 2) return null // only render ±2 around the active card

            const isCenter = abs === 0
            const isSide = abs === 1

            return (
              <motion.div
                key={game.id}
                data-card-idx={idx}
                className={`absolute bottom-0${isSide ? ' cursor-pointer' : ''}`}
                style={{
                  width: CARD_W,
                  left: '50%',
                  marginLeft: -CARD_W / 2,
                  originX: 0.5,
                  originY: 0,
                }}
                animate={{
                  x: distance * STEP,
                  scale: isCenter ? 1 : isSide ? 0.84 : 0.62,
                  opacity: isCenter ? 1 : isSide ? 0.65 : 0,
                  // No y-offset: side cards stay within the overflow-hidden boundary
                  y: 0,
                  zIndex: isCenter ? 10 : isSide ? 5 : 0,
                }}
                whileHover={
                  isCenter
                    ? {
                        scale: 1.03,
                        y: -16,
                        transition: { type: 'spring', stiffness: 400, damping: 25 },
                      }
                    : isSide
                      ? { opacity: 0.8, transition: { duration: 0.3 } }
                      : {}
                }
                transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.7 }}
              >
                <GameCardInner game={game} isCenter={isCenter} />
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* ── Dot indicators ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center gap-2"
      >
        {games.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to game ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === activeIdx ? 'h-2.5 w-7 bg-white' : 'h-2 w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </motion.div>
    </div>
  )
}
