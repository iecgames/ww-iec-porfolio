'use client'

import { IconConfetti, IconHeartFilled, IconSparkles, IconStarFilled } from '@tabler/icons-react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Link } from '@/i18n/navigation'
import React from 'react'

import type { Category, Post, Tag } from '@/payload-types'

import { Media } from '@/components/Media'
import { IconArrowUpRight } from '@tabler/icons-react'
import { formatDateSlash as formatPostDate } from '@/utilities/formatDateTime'

/* ──────────── helpers ──────────── */


function getCategories(categories?: (string | Category)[] | null): Category[] {
  if (!Array.isArray(categories)) return []
  return categories.filter((c): c is Category => typeof c === 'object' && c !== null)
}

function getTags(tags?: (string | Tag)[] | null): Tag[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((t): t is Tag => typeof t === 'object' && t !== null)
}

function extractPlainText(node: unknown, max: number = 220): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: unknown; children?: unknown }
  let out = ''
  if (typeof n.text === 'string') out += n.text
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      if (out.length >= max) break
      out += (out && !out.endsWith(' ') ? ' ' : '') + extractPlainText(child, max - out.length)
    }
  }
  return out.length > max ? out.slice(0, max).trimEnd() + '…' : out
}

function getPostExcerpt(post: Post, max: number = 220): string {
  if (post.meta?.description) return post.meta.description
  const fromContent = extractPlainText(post.content?.root, max)
  return fromContent.trim()
}

/* ──────────── shared subcomponents ──────────── */

const MetaLine: React.FC<{ categories: Category[]; date: string }> = ({ categories, date }) => {
  const hasCategories = categories.length > 0
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground md:text-xs">
      {hasCategories && (
        <>
          <span className="flex flex-wrap items-center gap-x-1.5 text-foreground/70">
            {categories.map((c, i) => (
              <React.Fragment key={c.id}>
                <span>{c.title}</span>
                {i < categories.length - 1 && <span className="text-muted-foreground/60">,</span>}
              </React.Fragment>
            ))}
          </span>
          <span aria-hidden className="text-muted-foreground/60">
            •
          </span>
        </>
      )}
      <span>{date}</span>
    </p>
  )
}

const HashtagList: React.FC<{ tags: Tag[]; size?: 'sm' | 'md' }> = ({ tags, size = 'md' }) => {
  if (tags.length === 0) return null
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs md:text-[13px]'
  return (
    <p className={`mt-2 flex flex-wrap gap-x-2 gap-y-1 font-semibold text-primary ${textSize}`}>
      {tags.map((t) => (
        <span key={t.id}>#{t.title.replace(/\s+/g, '_')}</span>
      ))}
    </p>
  )
}

/* ──────────── decorative layer ──────────── */

const FloatingIcon: React.FC<{
  className: string
  delay?: number
  duration?: number
  rotate?: [number, number]
  children: React.ReactNode
}> = ({ className, delay = 0, duration = 5, rotate = [-8, 8], children }) => {
  const reduced = useReducedMotion()
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute select-none ${className}`}
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
    >
      <motion.div
        animate={
          reduced
            ? undefined
            : {
                y: [0, -10, 0],
                rotate,
              }
        }
        transition={reduced ? undefined : { duration, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

const ConfettiDots: React.FC<{ className: string; color: string; count?: number }> = ({
  className,
  color,
  count = 6,
}) => {
  const reduced = useReducedMotion()
  // Deterministic pseudo-random positions to keep SSR/CSR markup stable
  const dots = Array.from({ length: count }, (_, i) => {
    const x = (i * 73) % 100
    const y = (i * 41 + 17) % 100
    const size = 6 + ((i * 11) % 10)
    return { x, y, size, i }
  })
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      {dots.map(({ x, y, size, i }) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            backgroundColor: color,
          }}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 0.7, scale: 1 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.5, delay: 0.05 * i, ease: 'easeOut' }}
        >
          {!reduced && (
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: color }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0.3, 0.7] }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
            />
          )}
        </motion.span>
      ))}
    </div>
  )
}

const DotGrid: React.FC<{
  className: string
  color: string
  size?: number
  gap?: number
  opacity?: number
}> = ({ className, color, size = 1.5, gap = 12, opacity = 0.5 }) => (
  <motion.div
    aria-hidden
    className={`pointer-events-none absolute ${className}`}
    style={{
      backgroundImage: `radial-gradient(circle, ${color} ${size}px, transparent ${size}px)`,
      backgroundSize: `${gap}px ${gap}px`,
    }}
    initial={{ opacity: 0 }}
    whileInView={{ opacity }}
    viewport={{ once: true, margin: '-10%' }}
    transition={{ duration: 0.8, ease: 'easeOut' }}
  />
)

const Decorations: React.FC = () => (
  <>
    {/* Soft pastel blobs */}
    <div
      aria-hidden
      className="pointer-events-none absolute -top-32 -right-32 h-112 w-md rounded-full bg-blue-200/30 blur-3xl"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-40 -left-32 h-128 w-lg rounded-full bg-sky-100/40 blur-3xl"
    />

    {/* Outline circles */}
    <div
      aria-hidden
      className="pointer-events-none absolute -top-20 right-12 hidden h-72 w-72 rounded-full border-2 border-blue-200/60 lg:block lg:h-96 lg:w-96"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-24 -left-24 hidden h-72 w-72 rounded-full border-2 border-sky-200/50 lg:block lg:h-88 lg:w-88"
    />

    {/* ── DOT GRIDS — sprinkled across corners ── */}

    {/* Top-left cluster */}
    <DotGrid
      className="left-4 top-8 h-24 w-32 md:left-8 md:top-12 md:h-36 md:w-48"
      color="rgba(96,165,250,0.45)"
      size={1.5}
      gap={12}
      opacity={0.65}
    />
    <DotGrid
      className="left-2 top-32 hidden h-20 w-20 md:block md:left-6 md:top-40 lg:left-12 lg:h-28 lg:w-28"
      color="rgba(59,130,246,0.5)"
      size={2}
      gap={16}
      opacity={0.5}
    />

    {/* Top-right cluster */}
    <DotGrid
      className="right-4 top-20 h-28 w-32 md:right-10 md:top-28 md:h-40 md:w-48 lg:right-16"
      color="rgba(14,165,233,0.4)"
      size={1.5}
      gap={12}
      opacity={0.55}
    />
    <DotGrid
      className="right-8 top-2 hidden h-16 w-32 md:block md:h-20 md:w-44 lg:right-32"
      color="rgba(56,189,248,0.5)"
      size={2}
      gap={14}
      opacity={0.6}
    />

    {/* Middle-left */}
    <DotGrid
      className="left-2 top-1/2 hidden h-24 w-16 -translate-y-1/2 md:block md:h-32 md:w-20 lg:left-6 lg:w-24"
      color="rgba(96,165,250,0.4)"
      size={1.5}
      gap={14}
      opacity={0.5}
    />

    {/* Middle-right */}
    <DotGrid
      className="right-2 top-1/2 hidden h-24 w-16 -translate-y-1/2 md:block md:h-32 md:w-20 lg:right-6 lg:w-24"
      color="rgba(59,130,246,0.4)"
      size={1.5}
      gap={14}
      opacity={0.5}
    />

    {/* Bottom-left cluster */}
    <DotGrid
      className="bottom-4 left-4 h-28 w-32 md:bottom-10 md:left-8 md:h-40 md:w-48 lg:left-16"
      color="rgba(96,165,250,0.45)"
      size={1.5}
      gap={12}
      opacity={0.6}
    />
    <DotGrid
      className="bottom-28 left-2 hidden h-16 w-20 md:block md:bottom-36 md:left-6 md:h-20 md:w-28 lg:bottom-44"
      color="rgba(59,130,246,0.5)"
      size={2}
      gap={14}
      opacity={0.5}
    />

    {/* Bottom-right cluster */}
    <DotGrid
      className="bottom-6 right-4 h-28 w-32 md:bottom-12 md:right-10 md:h-40 md:w-48 lg:right-20"
      color="rgba(14,165,233,0.4)"
      size={1.5}
      gap={12}
      opacity={0.6}
    />
    <DotGrid
      className="bottom-32 right-2 hidden h-16 w-20 md:block md:bottom-40 md:right-6 md:h-20 md:w-28 lg:bottom-52"
      color="rgba(56,189,248,0.5)"
      size={2}
      gap={14}
      opacity={0.5}
    />

    {/* ── Confetti — pulsing accent dots over the grids ── */}
    <ConfettiDots
      className="top-6 left-8 h-32 w-40 hidden md:block"
      color="rgba(96,165,250,0.7)"
      count={6}
    />
    <ConfettiDots
      className="top-10 right-12 h-32 w-40 hidden md:block"
      color="rgba(56,189,248,0.65)"
      count={5}
    />
    <ConfettiDots
      className="bottom-12 left-10 h-32 w-40 hidden md:block"
      color="rgba(59,130,246,0.65)"
      count={5}
    />
    <ConfettiDots
      className="bottom-10 right-8 h-32 w-40 hidden md:block"
      color="rgba(14,165,233,0.55)"
      count={6}
    />

    {/* ── Floating icons ── */}
    <FloatingIcon
      className="left-6 top-16 hidden md:block lg:left-10 lg:top-20"
      delay={0.1}
      duration={5.5}
      rotate={[-10, 10]}
    >
      <IconSparkles className="size-9 text-blue-400/80 lg:size-12" stroke={2} />
    </FloatingIcon>

    <FloatingIcon
      className="right-8 top-1/3 hidden lg:block"
      delay={0.3}
      duration={4.5}
      rotate={[8, -8]}
    >
      <IconStarFilled className="size-7 text-sky-400/80 lg:size-10" />
    </FloatingIcon>

    <FloatingIcon
      className="left-10 bottom-24 hidden md:block lg:left-14 lg:bottom-28"
      delay={0.45}
      duration={5}
      rotate={[-12, 6]}
    >
      <IconHeartFilled className="size-7 text-blue-500/85 lg:size-9" />
    </FloatingIcon>

    <FloatingIcon
      className="right-12 bottom-10 hidden md:block lg:right-20 lg:bottom-16"
      delay={0.6}
      duration={6}
      rotate={[6, -10]}
    >
      <IconConfetti className="size-9 text-sky-500/85 lg:size-12" stroke={2} />
    </FloatingIcon>
  </>
)

/* ──────────── motion variants ──────────── */

const container: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' } },
}

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

/* ──────────── main view ──────────── */

type Props = {
  posts: Post[]
  eyebrow?: string | null
  heading: string
  ctaLabel?: string | null
}

export const IECLifeView: React.FC<Props> = ({ posts, eyebrow, heading, ctaLabel }) => {
  const [featured, ...rest] = posts

  return (
    <section className="relative mx-4 my-8 overflow-hidden rounded-[2rem] bg-[#EBF3FF] py-16 md:mx-8 md:my-12 md:rounded-[2.5rem] md:py-20 lg:mx-12 lg:my-16 lg:rounded-[3rem] lg:py-24">
      <Decorations />

      <motion.div
        className="container relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-15%' }}
        variants={container}
      >
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-12">
          <motion.div variants={fadeUp}>
            {eyebrow && (
              <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {eyebrow}
              </span>
            )}
            {heading && (
              <h2
                className="bg-clip-text text-4xl font-black uppercase leading-none tracking-tight text-transparent md:text-5xl lg:text-6xl"
                style={{
                  backgroundImage: 'linear-gradient(120deg, #0a4bb1 0%, #1d6fe4 50%, #0ea5e9 100%)',
                  filter:
                    'drop-shadow(0 8px 18px rgba(10, 75, 177, 0.35)) drop-shadow(0 2px 4px rgba(14, 165, 233, 0.25))',
                }}
              >
                {heading}
              </h2>
            )}
          </motion.div>

          {ctaLabel && (
            <motion.div variants={fadeUp}>
              <Link
                href="/posts"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_-10px_rgba(0,111,238,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-10px_rgba(0,111,238,0.65)]"
              >
                <span>{ctaLabel}</span>
                <IconArrowUpRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  stroke={2.5}
                />
              </Link>
            </motion.div>
          )}
        </header>

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Featured */}
          {featured && (
            <motion.div variants={fadeLeft}>
              <Link
                href={`/posts/${featured.slug}`}
                className="group flex h-full flex-col rounded-3xl bg-white p-3 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] ring-1 ring-black/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_40px_70px_-25px_rgba(0,0,0,0.3)] md:p-4"
              >
                {featured.heroImage && typeof featured.heroImage === 'object' && (
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-muted">
                    <Media
                      fill
                      resource={featured.heroImage}
                      imgClassName="object-cover transition-transform duration-700 group-hover:scale-105"
                      size="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col px-3 pb-3 pt-5 md:px-4 md:pb-4 md:pt-6">
                  <MetaLine
                    categories={getCategories(featured.categories)}
                    date={formatPostDate(featured.publishedAt)}
                  />
                  <h3 className="mt-3 text-xl font-extrabold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary md:text-2xl">
                    {featured.title}
                  </h3>
                  {getPostExcerpt(featured) && (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {getPostExcerpt(featured)}
                    </p>
                  )}
                  <HashtagList tags={getTags(featured.tags)} />
                </div>
              </Link>
            </motion.div>
          )}

          {/* Side list */}
          {rest.length > 0 && (
            <motion.ul className="flex flex-col" variants={container}>
              {rest.map((post, idx) => (
                <motion.li
                  key={post.id}
                  variants={fadeRight}
                  className={idx > 0 ? 'border-t border-foreground/10 pt-5 md:pt-6' : ''}
                >
                  <Link
                    href={`/posts/${post.slug}`}
                    className={
                      'group flex gap-4 transition-all duration-300 hover:-translate-y-0.5 md:gap-5 ' +
                      (idx < rest.length - 1 ? 'pb-5 md:pb-6' : '')
                    }
                  >
                    {post.heroImage && typeof post.heroImage === 'object' && (
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-[0_10px_25px_-15px_rgba(0,0,0,0.25)] md:size-24">
                        <Media
                          fill
                          resource={post.heroImage}
                          imgClassName="object-cover transition-transform duration-500 group-hover:scale-110"
                          size="(max-width: 768px) 80px, 96px"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 self-center">
                      <MetaLine
                        categories={getCategories(post.categories)}
                        date={formatPostDate(post.publishedAt)}
                      />
                      <h4 className="mt-1.5 line-clamp-2 text-sm font-bold uppercase leading-snug text-foreground transition-colors duration-300 group-hover:text-primary md:text-base">
                        {post.title}
                      </h4>
                      {getPostExcerpt(post, 140) && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground md:text-sm">
                          {getPostExcerpt(post, 140)}
                        </p>
                      )}
                      <HashtagList tags={getTags(post.tags)} size="sm" />
                    </div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      </motion.div>
    </section>
  )
}
