import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { FeaturedPost } from './FeaturedPost'
import PageClient from './page.client'
import { PostsGrid } from './PostsGrid'

export const dynamic = 'force-static'
export const revalidate = 600

type Args = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const [posts, categories] = await Promise.all([
    payload.find({
      collection: 'posts',
      depth: 1,
      limit: 13,
      overrideAccess: false,
      locale: locale as 'en' | 'vi',
      sort: '-publishedAt',
      select: {
        title: true,
        slug: true,
        categories: true,
        tags: true,
        meta: true,
        publishedAt: true,
        heroImage: true,
      },
    }),
    payload.find({
      collection: 'categories',
      limit: 100,
      depth: 0,
      locale: locale as 'en' | 'vi',
      sort: 'title',
      select: { title: true },
    }),
  ])

  const [featuredPost, ...restPosts] = posts.docs

  return (
    <div className="pb-24">
      <PageClient />

      {/* Decorated top section: pink + blue tints, blobs, dots, grid, circles */}
      <section className="relative -mt-50 overflow-hidden pt-64 pb-20 md:pt-72">
        {/* Base background — radial pink (top-left) + blue (top-right) tints on white */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: [
              'radial-gradient(ellipse 60% 70% at top left, oklch(96% 0.04 15) 0%, transparent 55%)',
              'radial-gradient(ellipse 65% 75% at top right, oklch(96% 0.04 230) 0%, transparent 55%)',
              'linear-gradient(to bottom, oklch(99% 0.005 250) 0%, #ffffff 85%)',
            ].join(', '),
          }}
        />

        {/* Dot pattern — top-left and bottom-right corners */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-24 -z-10 h-64 w-64 opacity-60 md:left-8"
          style={{
            backgroundImage: 'radial-gradient(rgba(244, 114, 182, 0.45) 1.2px, transparent 1.5px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at top left, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at top left, black 30%, transparent 75%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-12 -z-10 h-56 w-72 opacity-70 md:right-6"
          style={{
            backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.45) 1.2px, transparent 1.5px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at bottom right, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at bottom right, black 30%, transparent 75%)',
          }}
        />

        {/* Grid pattern — subtle, fades at edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-40 -z-10 h-[40vh] opacity-50"
          style={{
            backgroundImage: [
              'linear-gradient(to right, rgba(99, 102, 241, 0.12) 1px, transparent 1px)',
              'linear-gradient(to bottom, rgba(99, 102, 241, 0.12) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '56px 56px',
            maskImage:
              'radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)',
          }}
        />

        {/* Outlined decorative circles */}
        <svg
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 -z-10 h-72 w-72 text-sky-300/40 md:-right-4"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1" />
        </svg>
        <svg
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-10 -z-10 h-56 w-56 text-rose-300/40 md:-left-2"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="38" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
        </svg>

        {/* Floating decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-10 left-[4%] -z-10 h-32 w-32 rounded-full bg-linear-to-br from-rose-200/50 to-pink-200/40 blur-2xl md:h-44 md:w-44"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-24 right-[6%] -z-10 h-36 w-36 rounded-full bg-linear-to-br from-sky-200/50 to-blue-200/40 blur-2xl md:h-52 md:w-52"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-[8%] -z-10 h-24 w-24 rounded-full bg-linear-to-br from-indigo-200/40 to-violet-200/30 blur-2xl md:h-32 md:w-32"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-8 right-[12%] -z-10 h-20 w-20 rounded-full bg-linear-to-br from-fuchsia-200/40 to-rose-200/30 blur-2xl md:h-28 md:w-28"
        />

        {/* Diagonal accent lines */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 720"
        >
          <defs>
            <linearGradient id="postsTopLinePink" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FBCFE8" stopOpacity="0" />
              <stop offset="50%" stopColor="#F9A8D4" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="postsTopLineBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0" />
              <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="120"
            x2="900"
            y2="-20"
            stroke="url(#postsTopLinePink)"
            strokeWidth="1.4"
          />
          <line
            x1="540"
            y1="720"
            x2="1440"
            y2="80"
            stroke="url(#postsTopLineBlue)"
            strokeWidth="1.4"
          />
        </svg>

        {/* Sparkle dots */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-16 right-[22%] -z-10 h-1.5 w-1.5 rounded-full bg-pink-400/60 shadow-[0_0_12px_rgba(244,114,182,0.55)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-28 left-[18%] -z-10 h-2 w-2 rounded-full bg-sky-400/60 shadow-[0_0_14px_rgba(56,189,248,0.55)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-40 right-[32%] -z-10 h-1 w-1 rounded-full bg-indigo-400/60 shadow-[0_0_10px_rgba(129,140,248,0.5)]"
        />

        {/* Featured Post */}
        {featuredPost && (
          <div className="container relative">
            <FeaturedPost post={featuredPost} />
          </div>
        )}
      </section>

      {/* Latest posts grid with category filter */}
      {restPosts.length > 0 && (
        <div className="container">
          <PostsGrid
            initialPosts={restPosts}
            initialTotal={posts.totalDocs}
            categories={categories.docs.map((c) => ({ id: c.id, title: c.title }))}
            locale={locale}
          />
        </div>
      )}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Posts`,
  }
}
