import React from 'react'
import { formatDateTime } from 'src/utilities/formatDateTime'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { ShareIconButton } from '@/components/ShareWidget/ShareIconButton'
import { formatAuthors } from '@/utilities/formatAuthors'

export const PostHero: React.FC<{
  post: Post
}> = ({ post }) => {
  const { categories, heroImage, meta, populatedAuthors, publishedAt, title } = post
  const description = meta?.description

  const displayImage =
    heroImage && typeof heroImage !== 'string'
      ? heroImage
      : meta?.image && typeof meta.image !== 'string'
        ? meta.image
        : null

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  return (
    <section className="container pt-6 md:pt-10">
      <div className="relative w-full max-w-6xl mx-auto overflow-hidden rounded-2xl md:rounded-3xl ring-1 ring-black/5 shadow-sm isolate">
        <div className="relative aspect-16/10 md:aspect-21/9 w-full bg-muted">
          {displayImage && (
            /* Wrapper is w-full max-w-6xl = 1152px; measured exactly that on production. */
            <Media
              fill
              priority
              imgClassName="object-cover"
              resource={displayImage}
              size="(max-width: 1152px) 100vw, 1152px"
            />
          )}

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/10" />

          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-14 lg:p-16 text-white">
            <div className="max-w-3xl">
              {categories && categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {categories.map((category, index) => {
                    if (typeof category === 'object' && category !== null) {
                      const titleToUse = category.title || 'Untitled category'
                      return (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-medium uppercase tracking-wide ring-1 ring-white/20"
                        >
                          {titleToUse}
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mb-5 drop-shadow-sm">
                {title}
              </h1>

              {description && (
                <p className="text-sm sm:text-base text-white/85 leading-relaxed mb-5 max-w-2xl line-clamp-3 drop-shadow-sm">
                  {description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
                {hasAuthors && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">By</span>
                    <span className="font-medium text-white">
                      {formatAuthors(populatedAuthors)}
                    </span>
                  </div>
                )}
                {hasAuthors && publishedAt && <span className="text-white/40">•</span>}
                {publishedAt && (
                  <time dateTime={publishedAt} className="text-white/80">
                    {formatDateTime(publishedAt)}
                  </time>
                )}
                <ShareIconButton tone="light" shareText={title} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
