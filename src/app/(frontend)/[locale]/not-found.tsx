'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useCallback, useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { useTransparentHeader } from '@/providers/TransparentHeader'

// Smooth cubic-bezier used for all entrance animations
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

export default function NotFound() {
  const t = useTranslations('NotFound')

  const containerRef = useRef<HTMLDivElement>(null)
  const { setTransparent } = useTransparentHeader()

  useEffect(() => {
    setTransparent(true)
    return () => setTransparent(false)
  }, [setTransparent])

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const springX = useSpring(rawX, { stiffness: 55, damping: 18 })
  const springY = useSpring(rawY, { stiffness: 55, damping: 18 })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
      rawX.set(x)
      rawY.set(y)
    },
    [rawX, rawY],
  )

  const handleMouseLeave = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
  }, [rawX, rawY])

  // Parallax — larger multiplier = closer layer = more movement
  const cloudX = useTransform(springX, (v) => v * 10)
  const cloudY = useTransform(springY, (v) => v * 5 - 50)

  const wallX = useTransform(springX, (v) => v * 24)
  const wallY = useTransform(springY, (v) => v * 12)

  const signX = useTransform(springX, (v) => v * 38 + 220)
  const signY = useTransform(springY, (v) => v * 20 + 140)

  const mascotX = useTransform(springX, (v) => v * 56 - 75)
  const mascotY = useTransform(springY, (v) => v * 26 + 50)

  // Non-mascot layers — mascot is rendered separately with float animation
  const bgLayers = [
    {
      src: '/page_404/cloud.png',
      alt: '',
      x: cloudX,
      y: cloudY,
      delay: 0,
      scale: 0.9,
      // Distant clouds: desaturated + brighter for atmospheric (aerial) perspective
      filter: 'drop-shadow(0 10px 16px rgba(40,80,120,0.10)) brightness(1.06) saturate(0.70)',
    },
    {
      src: '/page_404/wall.png',
      alt: '404 page not found',
      x: wallX,
      y: wallY,
      delay: 0.15,
      scale: 0.55,
      filter:
        'drop-shadow(6px 22px 32px rgba(30,55,85,0.32)) drop-shadow(0 4px 8px rgba(30,55,85,0.16))',
    },
    {
      src: '/page_404/sign.png',
      alt: 'Oops! Page not found',
      x: signX,
      y: signY,
      delay: 0.25,
      scale: 0.35,
      filter: 'drop-shadow(4px 12px 20px rgba(30,55,85,0.28))',
    },
  ]

  return (
    <div
      ref={containerRef}
      className="flex min-h-[calc(100vh+10rem)] -mt-40 flex-col items-center justify-center select-none overflow-hidden"
      style={{ background: 'linear-gradient(0deg, #A8D4EE 0%, #C8E6F5 40%, #DFF1FA 100%)' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Parallax scene ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ maxWidth: 1100, aspectRatio: '1280 / 854' }}
      >
        {/* Background + mid-ground — outer div carries parallax, inner carries entrance */}
        {bgLayers.map(({ src, alt, x, y, delay, scale, filter }) => (
          <motion.div key={src} className="absolute inset-0" style={{ x, y, scale, filter }}>
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay, ease: EASE }}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain"
                priority={delay === 0}
                draggable={false}
              />
            </motion.div>
          </motion.div>
        ))}

        {/* Mascot — foreground, floats after entrance */}
        <motion.div
          className="absolute inset-0"
          style={{
            x: mascotX,
            y: mascotY,
            scale: 0.8,
            filter:
              'drop-shadow(8px 24px 36px rgba(30,55,85,0.38)) drop-shadow(0 6px 12px rgba(30,55,85,0.18))',
          }}
        >
          {/* Entrance */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
          >
            {/* Float — gentle perpetual bob starts after entrance settles */}
            <motion.div
              className="absolute inset-0"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
            >
              <Image
                src="/page_404/mascot.png"
                alt="Lost mascot"
                fill
                className="object-contain"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── CTA — slides up after scene ── */}
      <motion.div
        className="flex flex-col items-center gap-3 mt-1 pb-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
      >
        <p className="text-sm text-[#3a6680]">{t('description')}</p>
        <Button asChild size="lg">
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </motion.div>
    </div>
  )
}
