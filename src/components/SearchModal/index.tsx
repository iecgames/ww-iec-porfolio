'use client'

import { Link } from '@/i18n/navigation'
import { useSearchModal } from '@/providers/SearchModal'
import { cn } from '@/utilities/ui'
import { useDebounce } from '@/utilities/useDebounce'
import { IconBriefcase, IconCategory, IconFileText, IconSearch } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'

type GroupKey = 'posts' | 'jobs' | 'categories'

type TablerIcon = React.ComponentType<{ size?: number; className?: string; stroke?: number }>

type ResultItem = { id: string; title: string; href: string }

type ResultGroup = {
  key: GroupKey
  label: string
  Icon: TablerIcon
  items: ResultItem[]
}

type ApiDoc = { id: string | number; title?: string | null; slug?: string | null }

/** Per-group identity: icon + a distinct accent color used across header, line and hover. */
const GROUP_META: Record<GroupKey, { Icon: TablerIcon; bg: string; text: string; border: string; hover: string }> = {
  posts: {
    Icon: IconFileText,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'group-hover:text-blue-600',
  },
  jobs: {
    Icon: IconBriefcase,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    hover: 'group-hover:text-emerald-600',
  },
  categories: {
    Icon: IconCategory,
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-600',
    border: 'border-fuchsia-200',
    hover: 'group-hover:text-fuchsia-600',
  },
}

/** Build a Payload REST query string for a `like` search across the given fields. */
function buildQuery(fields: string[], q: string, locale: string): string {
  const params = new URLSearchParams()
  if (fields.length === 1) {
    params.set(`where[${fields[0]}][like]`, q)
  } else {
    fields.forEach((field, i) => params.set(`where[or][${i}][${field}][like]`, q))
  }
  params.set('limit', '5')
  params.set('depth', '0')
  params.set('locale', locale)
  return params.toString()
}

const LOCALES = ['en', 'vi'] as const

async function fetchDocs(
  collection: string,
  fields: string[],
  q: string,
  locale: string,
  signal: AbortSignal,
): Promise<ApiDoc[]> {
  try {
    const res = await fetch(`/api/${collection}?${buildQuery(fields, q, locale)}`, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.docs ?? []) as ApiDoc[]
  } catch {
    return []
  }
}

/**
 * Search a collection across BOTH locales so a keyword matches regardless of
 * the language it was typed in. Results are merged by id, preferring the
 * current locale's values for display.
 */
async function searchCollection(
  collection: string,
  fields: string[],
  q: string,
  displayLocale: string,
  signal: AbortSignal,
): Promise<ApiDoc[]> {
  const perLocale = await Promise.all(
    LOCALES.map((loc) => fetchDocs(collection, fields, q, loc, signal)),
  )

  // Apply the current locale last so its values win on id collisions.
  const ordered = LOCALES.map((loc, i) => ({ loc, docs: perLocale[i] })).sort((a) =>
    a.loc === displayLocale ? 1 : -1,
  )

  const byId = new Map<string, ApiDoc>()
  for (const { docs } of ordered) {
    for (const doc of docs) byId.set(String(doc.id), doc)
  }
  return [...byId.values()]
}

export const SearchModal: React.FC = () => {
  const { isOpen, closeModal } = useSearchModal()
  const t = useTranslations('Search')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<ResultGroup[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Focus input and reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setGroups([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Lock scroll while open
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Fetch results across posts, jobs and categories in parallel
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) {
      setGroups([])
      return
    }

    const controller = new AbortController()
    setLoading(true)

    Promise.all([
      searchCollection('posts', ['title', 'meta.description'], q, locale, controller.signal),
      searchCollection('jobs', ['title', 'description'], q, locale, controller.signal),
      searchCollection('categories', ['title'], q, locale, controller.signal),
    ])
      .then(([posts, jobs, categories]) => {
        if (controller.signal.aborted) return

        const next: ResultGroup[] = []

        if (posts.length > 0) {
          next.push({
            key: 'posts',
            label: t('groups.posts'),
            Icon: GROUP_META.posts.Icon,
            items: posts.map((d) => ({
              id: String(d.id),
              title: d.title || '',
              href: `/posts/${d.slug}`,
            })),
          })
        }

        if (jobs.length > 0) {
          next.push({
            key: 'jobs',
            label: t('groups.jobs'),
            Icon: GROUP_META.jobs.Icon,
            items: jobs.map((d) => ({
              id: String(d.id),
              title: d.title || '',
              href: `/career/${d.id}`,
            })),
          })
        }

        if (categories.length > 0) {
          next.push({
            key: 'categories',
            label: t('groups.categories'),
            Icon: GROUP_META.categories.Icon,
            items: categories.map((d) => ({
              id: String(d.id),
              title: d.title || '',
              href: d.slug ? `/posts/category/${d.slug}` : '/posts',
            })),
          })
        }

        setGroups(next)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [debouncedQuery, locale, t])

  if (!isOpen) return null

  const hasResults = groups.length > 0

  return (
    <div
      className="fixed inset-0 z-9999 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-lg mx-4 bg-background rounded-xl shadow-2xl overflow-hidden border border-divider"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-divider">
          <IconSearch size={18} className="text-foreground-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent text-foreground placeholder:text-foreground-400 outline-none text-sm"
          />
          <kbd className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-foreground-400 bg-default-100 rounded border border-default-300 select-none">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <p className="px-4 py-6 text-center text-sm text-foreground-400">{t('searching')}</p>
          )}

          {!loading && debouncedQuery.trim() && !hasResults && (
            <p className="px-4 py-6 text-center text-sm text-foreground-400">{t('noResults')}</p>
          )}

          {!loading && !debouncedQuery.trim() && (
            <p className="px-4 py-6 text-center text-sm text-foreground-400">{t('typeToStart')}</p>
          )}

          {!loading &&
            hasResults &&
            groups.map((group) => {
              const meta = GROUP_META[group.key]
              return (
                <div key={group.key} className="px-2 py-2">
                  {/* Group header — highlighted bar with large colored icon + title */}
                  <div
                    className={cn(
                      'flex items-center gap-2.5 mx-2 mb-2 px-3.5 py-2.5 rounded-xl',
                      meta.bg,
                      meta.text,
                    )}
                  >
                    <group.Icon size={22} stroke={2.2} className="shrink-0" />
                    <span className="text-sm font-extrabold uppercase tracking-wider">
                      {group.label}
                    </span>
                    <span className="ml-auto text-xs font-bold tabular-nums opacity-70">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Results — indented under the group, with a colored connecting line */}
                  <ul className={cn('ml-6 border-l-2 pl-1', meta.border)}>
                    {group.items.map((item) => (
                      <li key={`${group.key}-${item.id}`}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-default-100 transition-colors group"
                          onClick={closeModal}
                        >
                          <group.Icon
                            size={16}
                            className={cn(
                              'text-foreground-300 shrink-0 transition-colors',
                              meta.hover,
                            )}
                          />
                          <span
                            className={cn(
                              'text-sm text-foreground truncate transition-colors',
                              meta.hover,
                            )}
                          >
                            {item.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
