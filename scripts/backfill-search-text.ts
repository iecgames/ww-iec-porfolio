/**
 * Populate `searchText` on documents written before the syncSearchText hook
 * existed. The hook only fires on save, so without this pass those documents
 * stay invisible to accent-insensitive search until someone re-saves them.
 *
 * Imports the same fold helper the hook uses rather than reimplementing it, so
 * the two cannot drift apart.
 *
 * Dry-run by default; --confirm writes. Idempotent — safe to re-run.
 *
 *   pnpm backfill:search
 *   pnpm backfill:search -- --confirm
 */
import 'dotenv/config'

import config from '@payload-config'
import { type CollectionSlug, getPayload } from 'payload'

import { foldVietnamese } from '../src/utilities/foldVietnamese'

const LOCALES = ['en', 'vi'] as const

/** Must mirror the syncSearchText(...) arguments in each collection config. */
const TARGETS: { collection: CollectionSlug; fields: string[] }[] = [
  { collection: 'posts', fields: ['title', 'meta.description'] },
  { collection: 'jobs', fields: ['title', 'description'] },
  { collection: 'categories', fields: ['title'] },
]

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, source)
}

async function main() {
  const confirm = process.argv.slice(2).includes('--confirm')
  const payload = await getPayload({ config })

  let planned = 0
  let written = 0

  for (const { collection, fields } of TARGETS) {
    for (const locale of LOCALES) {
      const { docs } = await payload.find({
        collection,
        locale,
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })

      console.log(`\n── ${collection} [${locale}] — ${docs.length} doc(s)`)

      for (const doc of docs) {
        const searchText = foldVietnamese(
          fields
            .map((path) => readPath(doc, path))
            .filter((v): v is string => typeof v === 'string')
            .join(' '),
        )

        const current = (doc as { searchText?: string | null }).searchText ?? ''
        const mark = current === searchText ? '=' : '+'
        planned += 1

        console.log(`  ${mark} ${String(doc.id)}  ${JSON.stringify(searchText)}`)

        if (confirm && current !== searchText) {
          await payload.update({
            collection,
            id: doc.id,
            locale,
            data: { searchText } as never,
            overrideAccess: true,
            // No revalidate storm across hundreds of documents, and — far more
            // important — no subscriber emails from touching a published post.
            context: { disableRevalidate: true, skipNotifications: true },
          })
          written += 1
        }
      }
    }
  }

  console.log('')
  if (confirm) {
    console.log(`Done. ${written} document(s) updated out of ${planned} inspected.`)
  } else {
    console.log(`DRY RUN — ${planned} document(s) inspected, nothing written.`)
    console.log('Re-run with --confirm to apply. Lines marked + would change.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
