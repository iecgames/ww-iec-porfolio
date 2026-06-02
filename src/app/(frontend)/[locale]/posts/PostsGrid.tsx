'use client'

import { Card, type CardPostData } from '@/components/Card'
import type { Category } from '@/payload-types'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState, useTransition } from 'react'

type Props = {
  initialPosts: CardPostData[]
  initialTotal: number
  categories: Pick<Category, 'id' | 'title'>[]
  locale: string
}

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

export function PostsGrid({ initialPosts, initialTotal, categories, locale }: Props) {
  const t = useTranslations('Posts')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [posts, setPosts] = useState<CardPostData[]>(initialPosts)
  const [total, setTotal] = useState(initialTotal)
  const [isPending, startTransition] = useTransition()

  const handleSelect = (id: string | null) => {
    if (id === selectedId) return
    setSelectedId(id)

    if (id === null) {
      setPosts(initialPosts)
      setTotal(initialTotal)
      return
    }

    startTransition(async () => {
      const params = new URLSearchParams({
        'where[categories][in][0]': id,
        sort: '-publishedAt',
        limit: '12',
        depth: '1',
        locale,
      })
      const res = await fetch(`/api/posts?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setPosts(data.docs ?? [])
      setTotal(data.totalDocs ?? 0)
    })
  }

  const filterItems: { id: string | null; title: string }[] = [
    { id: null, title: t('all') },
    ...categories.map((c) => ({ id: c.id as string, title: c.title })),
  ]

  return (
    <div>
      {/* Heading + category filters */}
      <motion.div
        className="flex flex-wrap items-center gap-3 mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 mr-2">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#1447e6' }} />
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            {t('latestUpdates')}
          </h2>
        </div>

        {filterItems.map((item) => {
          const isActive = selectedId === item.id
          const key = item.id ?? 'all'
          return (
            <motion.button
              key={key}
              onClick={() => handleSelect(item.id)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={`relative px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isActive
                  ? 'text-white border-transparent'
                  : 'text-foreground/60 border-border hover:text-foreground hover:border-foreground/40'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="category-filter-pill"
                  className="absolute inset-0 rounded-full bg-primary shadow-md"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.title}</span>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Grid */}
      <motion.div
        key={selectedId ?? 'all'}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <AnimatePresence mode="popLayout">
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <motion.div
                key={post.slug ?? index}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                layout
              >
                <Card doc={post} relationTo="posts" showCategories showDescription />
              </motion.div>
            ))
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="col-span-full text-sm text-muted-foreground py-8 text-center"
            >
              {t('noPostsInCategory')}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Load more — only shown when "Tất cả" and there are more posts */}
      {selectedId === null && total > 13 && (
        <motion.div
          className="flex justify-center mt-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href="/posts/page/2"
            className="border text-foreground px-10 py-3 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors rounded-full"
            style={{ borderColor: '#1447e6', color: '#1447e6' }}
          >
            {t('loadMore')}
          </Link>
        </motion.div>
      )}
    </div>
  )
}
