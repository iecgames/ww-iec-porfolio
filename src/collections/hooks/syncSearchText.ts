import type { CollectionBeforeChangeHook } from 'payload'

import { foldVietnamese } from '@/utilities/foldVietnamese'

const LOCALES = ['en', 'vi'] as const
type Locale = (typeof LOCALES)[number]

/** Read a dot path like `meta.description` out of a document. */
function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, source)
}

/**
 * Payload hands localized values as plain strings when a write targets one
 * locale, but as `{ en, vi }` when it targets all of them (seeds, migrations).
 */
function isLocaleMap(value: unknown): value is Partial<Record<Locale, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every((key) => (LOCALES as readonly string[]).includes(key))
}

function join(values: unknown[]): string {
  return foldVietnamese(values.filter((v): v is string => typeof v === 'string').join(' '))
}

/**
 * Keeps a folded, diacritic-free copy of the given fields in `searchText`, so
 * the search route can match "hoa si" against "Họa sĩ".
 *
 * @param fields dot paths to concatenate, e.g. `['title', 'meta.description']`
 */
export const syncSearchText =
  (fields: string[]): CollectionBeforeChangeHook =>
  ({ data, originalDoc }) => {
    // A partial update carries only the changed fields, so fall back to the
    // stored document per field — merging the two objects wholesale would drop
    // siblings of any nested group that `data` happens to touch.
    const values = fields.map((path) => {
      const incoming = readPath(data, path)
      return incoming !== undefined ? incoming : readPath(originalDoc, path)
    })

    if (values.some(isLocaleMap)) {
      data.searchText = Object.fromEntries(
        LOCALES.map((locale) => [
          locale,
          join(values.map((value) => (isLocaleMap(value) ? value[locale] : value))),
        ]),
      )
    } else {
      data.searchText = join(values)
    }

    return data
  }
