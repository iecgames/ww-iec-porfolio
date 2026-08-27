/**
 * List every Tabler icon name currently stored in the CMS.
 *
 * `TablerIcon` renders from a static registry (`src/components/TablerIcon/
 * iconRegistry.ts`) instead of a glob dynamic import — see
 * `plans/260826-1801-frontend-bundle-and-assets/`. A static registry means an
 * icon that editors already picked but which is missing from the registry would
 * silently render nothing. This script is how we keep the two in sync.
 *
 * Walks every document in every collection and global and collects the value of
 * any key named `icon`, at any depth, rather than hard-coding the one known
 * path (`hero.overlayContent[].tabs[].icon` on the `policyTabs` block). A
 * generic walk keeps working if another icon field is added later.
 *
 * Scans published and draft documents both, so an icon an editor has staged but
 * not published yet is not dropped.
 *
 * With --check, exits non-zero when the CMS holds a name the registry lacks —
 * suitable for a build gate.
 *
 *   pnpm exec tsx scripts/collect-cms-icons.ts
 *   pnpm exec tsx scripts/collect-cms-icons.ts --check
 */
import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { iconRegistry } from '../src/components/TablerIcon/iconRegistry'

/** Collect the value of every `icon` key at any depth. */
function collectIcons(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectIcons(item, found)
    return
  }
  if (!node || typeof node !== 'object') return

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'icon' && typeof value === 'string' && value.trim()) {
      found.add(value.trim())
    } else {
      collectIcons(value, found)
    }
  }
}

async function main() {
  const check = process.argv.slice(2).includes('--check')
  const payload = await getPayload({ config })

  const found = new Set<string>()
  const sources = new Map<string, Set<string>>()

  const note = (name: string, where: string) => {
    if (!sources.has(name)) sources.set(name, new Set())
    sources.get(name)!.add(where)
  }

  for (const collection of Object.keys(payload.collections)) {
    for (const draft of [false, true]) {
      let docs: unknown[] = []
      try {
        const res = await payload.find({
          collection: collection as Parameters<typeof payload.find>[0]['collection'],
          depth: 0,
          draft,
          limit: 0,
          overrideAccess: true,
          pagination: false,
        })
        docs = res.docs
      } catch {
        // Collections without drafts reject `draft: true`; skip that pass.
        continue
      }
      for (const doc of docs) {
        const before = new Set(found)
        collectIcons(doc, found)
        for (const name of found) if (!before.has(name)) note(name, collection)
      }
    }
  }

  for (const global of payload.config.globals) {
    for (const draft of [false, true]) {
      try {
        const doc = await payload.findGlobal({
          slug: global.slug as Parameters<typeof payload.findGlobal>[0]['slug'],
          depth: 0,
          draft,
          overrideAccess: true,
        })
        const before = new Set(found)
        collectIcons(doc, found)
        for (const name of found) if (!before.has(name)) note(name, `global:${global.slug}`)
      } catch {
        continue
      }
    }
  }

  const names = [...found].sort()
  const missing = names.filter((n) => !(n in iconRegistry))

  console.log(`\nIcons stored in the CMS (${names.length}):`)
  for (const name of names) {
    const where = [...(sources.get(name) ?? [])].join(', ')
    const mark = name in iconRegistry ? '  ' : '!!'
    console.log(`  ${mark} ${name}${where ? `   [${where}]` : ''}`)
  }

  console.log(`\nRegistry holds ${Object.keys(iconRegistry).length} icons.`)
  if (missing.length) {
    console.log(`\nMISSING from iconRegistry (${missing.length}):`)
    for (const name of missing) console.log(`  ${name}`)
  } else {
    console.log('\nEvery icon in the CMS is present in iconRegistry.')
  }

  if (check && missing.length) process.exit(1)
  process.exit(0)
}

void main()
