'use client'

import { Media } from '@/components/Media'
import type { Post } from '@/payload-types'
import { Card, CardBody, Chip } from '@heroui/react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

export type FeaturedPostData = Pick<
  Post,
  'slug' | 'categories' | 'meta' | 'title' | 'publishedAt' | 'heroImage'
>

function formatDateDDMMYYYY(timestamp: string): string {
  const date = new Date(timestamp)
  const DD = String(date.getDate()).padStart(2, '0')
  const MM = String(date.getMonth() + 1).padStart(2, '0')
  const YYYY = date.getFullYear()
  return `${DD}.${MM}.${YYYY}`
}

export const FeaturedPost: React.FC<{ post: FeaturedPostData }> = ({ post }) => {
  const t = useTranslations('Posts')
  const image =
    post.heroImage && typeof post.heroImage !== 'string'
      ? post.heroImage
      : post.meta?.image && typeof post.meta.image !== 'string'
        ? post.meta.image
        : null

  const hasCategories =
    post.categories && Array.isArray(post.categories) && post.categories.length > 0

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Decorative gradient glow behind card */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-4xl bg-linear-to-r from-indigo-500/30 via-blue-500/20 to-purple-500/30 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
      />

      <Card
        radius="none"
        className="relative grid grid-cols-12 overflow-hidden rounded-4xl border border-border shadow-xl transition-shadow duration-500 group-hover:shadow-2xl min-h-[60vh]"
      >
        {/* Left: hero image — 2/3 of card width */}
        <div className="col-span-8 relative bg-muted overflow-hidden">
          {image ? (
            <>
              <Media
                fill
                resource={image}
                imgClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                priority
              />
              {/* Gradient overlay on image (depth) */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent pointer-events-none"
              />

              {/* Right-edge gradient overlay — fades from transparent into the primary-tinted info panel */}
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 w-2/3 bg-linear-to-r from-transparent via-primary/10 to-primary/20 pointer-events-none"
              />

              {/* Top-left floating badge */}
              <div className="absolute top-5 left-5 z-10">
                <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-3 py-1.5 shadow-lg ring-1 ring-white/50">
                  <svg
                    className="h-3.5 w-3.5 text-amber-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 22 12 17.27 5.79 22l2.39-8.15L2 9.36h7.61z" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {t('featured')}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
        </div>

        {/* Right: content */}
        <CardBody className="col-span-4 relative flex flex-col justify-center gap-5 p-10 bg-linear-to-br from-primary/20 via-primary/10 to-blue-50 overflow-hidden">
          {/* Left-edge accent stripe — anchors the info panel in primary blue */}
          <div
            aria-hidden
            className="absolute inset-y-6 left-0 w-1 rounded-r-full bg-linear-to-b from-primary to-blue-600"
          />
          {/* Decorative blobs — saturated primary-blue tones for stronger accent */}
          <div
            aria-hidden
            className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-linear-to-br from-primary/40 to-blue-500/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-20 right-8 h-52 w-52 rounded-full bg-linear-to-tr from-blue-400/35 to-primary/25 blur-3xl"
          />

          {/* Badge row */}
          <div className="relative flex items-center gap-3 flex-wrap">
            {hasCategories && (
              <div className="flex flex-wrap gap-2">
                {post.categories!.map((cat, i) => {
                  if (typeof cat !== 'object') return null
                  return (
                    <Chip
                      key={i}
                      size="sm"
                      color="primary"
                      variant="shadow"
                      classNames={{ base: 'font-semibold' }}
                    >
                      {cat.title}
                    </Chip>
                  )
                })}
              </div>
            )}
            {post.publishedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDateDDMMYYYY(post.publishedAt)}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="relative text-3xl font-extrabold leading-tight text-foreground transition-colors duration-300 group-hover:text-primary">
            <Link href={`/posts/${post.slug}`} className="line-clamp-3">
              {post.title}
            </Link>
          </h2>

          {/* Decorative divider */}
          <div className="relative h-1 w-16 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />

          {/* Description */}
          {post.meta?.description && (
            <p className="relative text-muted-foreground line-clamp-4 text-base leading-relaxed">
              {post.meta.description}
            </p>
          )}

          {/* CTA */}
          <Link
            href={`/posts/${post.slug}`}
            className="relative inline-flex items-center gap-2 font-semibold text-sm w-fit text-primary group/cta"
          >
            <span className="relative">
              {t('readMore')}
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover/cta:w-full" />
            </span>
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </CardBody>
      </Card>
    </motion.div>
  )
}
