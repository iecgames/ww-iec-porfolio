import configPromise from '@payload-config'
import { type CollectionSlug, getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { foldVietnamese } from '@/utilities/foldVietnamese'

/**
 * Site-wide search for the header search modal.
 *
 * The modal used to fan out one REST call per collection per locale — six
 * round-trips on every debounced keystroke — and merge the results in the
 * browser. This runs the same queries through the Local API in one process and
 * returns them already grouped and de-duplicated.
 *
 * Matching runs against each collection's `searchText` — a folded,
 * diacritic-free copy maintained by the syncSearchText hook — so "hoa si" finds
 * "Họa sĩ" and an NFD query still matches NFC storage. The incoming query is
 * folded the same way before it is compared.
 */

const LOCALES = ['en', 'vi'] as const
type Locale = (typeof LOCALES)[number]

const PER_COLLECTION_LIMIT = 5
const MAX_QUERY_LENGTH = 100

type SearchTarget = { collection: CollectionSlug }

const TARGETS = {
  posts: { collection: 'posts' },
  jobs: { collection: 'jobs' },
  categories: { collection: 'categories' },
} satisfies Record<string, SearchTarget>

type GroupKey = keyof typeof TARGETS

type ResultDoc = { id: string; title: string | null; slug: string | null }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const requestedLocale = searchParams.get('locale')
  const displayLocale: Locale = LOCALES.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : 'en'

  // Fold before the emptiness check: a string of nothing but combining marks
  // folds away to nothing and must not reach the database as a match-all.
  const folded = foldVietnamese(q)

  if (!folded || q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ posts: [], jobs: [], categories: [] })
  }

  const payload = await getPayload({ config: configPromise })

  const groupKeys = Object.keys(TARGETS) as GroupKey[]

  const groups = await Promise.all(
    groupKeys.map(async (key) => {
      const { collection } = TARGETS[key]

      // Search every locale so a keyword matches regardless of the language it
      // was typed in; the display locale is applied last so its values win.
      const perLocale = await Promise.all(
        LOCALES.map(async (locale) => {
          const { docs } = await payload.find({
            collection,
            where: { searchText: { like: folded } },
            limit: PER_COLLECTION_LIMIT,
            depth: 0,
            locale,
            overrideAccess: false,
            select: { title: true, slug: true } as never,
          })
          return { locale, docs }
        }),
      )

      const ordered = [...perLocale].sort((a) => (a.locale === displayLocale ? 1 : -1))

      const byId = new Map<string, ResultDoc>()
      for (const { docs } of ordered) {
        for (const doc of docs) {
          const record = doc as { id: string | number; title?: unknown; slug?: unknown }
          byId.set(String(record.id), {
            id: String(record.id),
            title: typeof record.title === 'string' ? record.title : null,
            slug: typeof record.slug === 'string' ? record.slug : null,
          })
        }
      }

      return [key, [...byId.values()]] as const
    }),
  )

  return NextResponse.json(Object.fromEntries(groups))
}
