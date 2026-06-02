'use client'

import { Media } from '@/components/Media'
import type { Post } from '@/payload-types'
import {
  Decorations,
  formatPostDate,
  getPostExcerpt,
  getTags,
} from '@/blocks/CategoryShowcase/CategoryShowcaseView'
import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import React from 'react'

type Props = {
  eyebrow: string
  heading: string
  countLabel?: string
  emptyLabel: string
  posts: Post[]
}

const container: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

/** Photo-overlay card — same visual language as the CategoryShowcase block,
 *  but with an image fallback so every post renders in the archive grid. */
const ArchiveCard: React.FC<{ post: Post }> = ({ post }) => {
  const image =
    post.heroImage && typeof post.heroImage === 'object'
      ? post.heroImage
      : post.meta?.image && typeof post.meta.image === 'object'
        ? post.meta.image
        : null
  const tags = getTags(post.tags).slice(0, 2)
  const date = formatPostDate(post.publishedAt)
  const excerpt = getPostExcerpt(post, 140)

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group block h-72 rounded-3xl shadow-[0_8px_20px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_30px_55px_-15px_rgba(0,0,0,0.35)] md:h-80"
    >
      <div className="relative h-full overflow-hidden rounded-3xl bg-muted">
        {image ? (
          <Media
            fill
            resource={image}
            imgClassName="object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-1"
            size="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-br from-rose-200 via-pink-200 to-orange-200"
          />
        )}

        {/* Persistent gradient — keeps text legible */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-900/95 via-slate-900/55 to-slate-900/10 transition-opacity duration-500 group-hover:via-slate-900/70"
        />

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 text-white md:p-5">
          {(tags.length > 0 || date) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wide md:text-[11px]">
              {tags.map((t) => (
                <span key={t.id} className="text-sky-300">
                  #{t.title.replace(/\s+/g, '_')}
                </span>
              ))}
              {tags.length > 0 && date && (
                <span aria-hidden className="text-white/50">
                  •
                </span>
              )}
              {date && <span className="text-white/80">{date}</span>}
            </div>
          )}
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white md:text-base">
            {post.title}
          </h3>
          {excerpt && (
            <p className="line-clamp-2 max-h-0 overflow-hidden text-[11px] leading-relaxed text-white/75 opacity-0 transition-all duration-500 ease-out group-hover:max-h-20 group-hover:opacity-100 md:text-xs">
              {excerpt}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

export const CategoryArchiveView: React.FC<Props> = ({
  eyebrow,
  heading,
  countLabel,
  emptyLabel,
  posts,
}) => {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-white via-pink-50/70 to-white pt-32 pb-20 md:pt-40 md:pb-24">
      <Decorations />

      <div className="container relative">
        {/* Header */}
        <motion.div
          className="mb-10 max-w-2xl md:mb-12"
          initial="hidden"
          animate="visible"
          variants={container}
        >
          {eyebrow && (
            <motion.span
              variants={fadeUp}
              className="mb-4 block text-xs font-bold uppercase tracking-[0.25em] text-primary"
            >
              {eyebrow}
            </motion.span>
          )}

          <motion.h1
            variants={fadeUp}
            className="text-4xl font-black leading-[1.1] tracking-tight md:text-5xl lg:text-6xl"
            style={{
              background: 'linear-gradient(120deg, #E11D48 0%, #EC4899 55%, #FB923C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {heading}
          </motion.h1>

          {countLabel && (
            <motion.p variants={fadeUp} className="mt-4 text-base text-muted-foreground">
              {countLabel}
            </motion.p>
          )}
        </motion.div>

        {/* Posts grid */}
        {posts.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10%' }}
            variants={container}
          >
            {posts.map((post, index) => (
              <motion.div key={index} variants={popIn}>
                <ArchiveCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </section>
  )
}
