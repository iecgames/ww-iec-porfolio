/**
 * One-off purge of stored job applications and the CV files they point at.
 *
 * CVs are uploaded into the `media` collection — the same collection that holds
 * the site logo, hero images and post imagery — and carry no field marking them
 * as a CV. The only trustworthy link is `job-applications.cv -> media.id`, so
 * this script MUST collect those ids before deleting any application, and MUST
 * run while JobApplications is still registered in payload.config.ts.
 *
 * Dry-run by default. Pass --confirm to actually delete.
 *
 *   pnpm purge:applications -- --out ../applications-backup.json
 *   pnpm purge:applications -- --out ../applications-backup.json --confirm
 */
import 'dotenv/config'

import config from '@payload-config'
import { writeFileSync } from 'fs'
import path from 'path'
import { getPayload } from 'payload'

/** Media whose alt does not look like a CV is treated as a site asset and aborts the run. */
const CV_ALT_PATTERN = /^CV\s*[—–-]/

type CvRef = { mediaId: string; alt: string; filename: string; url: string }

function parseArgs() {
  const argv = process.argv.slice(2)
  const confirm = argv.includes('--confirm')
  const outIndex = argv.indexOf('--out')
  const out =
    outIndex !== -1 && argv[outIndex + 1]
      ? path.resolve(argv[outIndex + 1])
      : path.resolve(process.cwd(), '..', 'job-applications-backup.json')

  return { confirm, out }
}

async function main() {
  const { confirm, out } = parseArgs()
  const payload = await getPayload({ config })

  // ── 1. Read every application with its CV populated ────────────────────────
  const { docs: applications } = await payload.find({
    collection: 'job-applications',
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })

  const mediaBefore = await payload.count({ collection: 'media', overrideAccess: true })

  console.log('')
  console.log('═'.repeat(70))
  console.log(`  Applications found : ${applications.length}`)
  console.log(`  Media docs total   : ${mediaBefore.totalDocs}`)
  console.log('═'.repeat(70))

  if (applications.length === 0) {
    console.log('\nNothing to purge.\n')
    return
  }

  // ── 2. Back up before touching anything ────────────────────────────────────
  writeFileSync(out, JSON.stringify(applications, null, 2), 'utf8')
  console.log(`\n  Backup written to: ${out}\n`)

  // ── 3. Collect CV media ids — MUST happen before any delete ────────────────
  const cvRefs: CvRef[] = []
  const missingCv: string[] = []

  for (const app of applications) {
    const cv = (app as { cv?: unknown }).cv
    if (cv && typeof cv === 'object' && 'id' in cv) {
      const media = cv as { id: string | number; alt?: string; filename?: string; url?: string }
      cvRefs.push({
        mediaId: String(media.id),
        alt: media.alt ?? '',
        filename: media.filename ?? '',
        url: media.url ?? '',
      })
    } else if (typeof cv === 'string' || typeof cv === 'number') {
      // depth:1 should populate, but tolerate a bare id by fetching it
      const media = await payload.findByID({
        collection: 'media',
        id: String(cv),
        depth: 0,
        overrideAccess: true,
      })
      cvRefs.push({
        mediaId: String(media.id),
        alt: media.alt ?? '',
        filename: media.filename ?? '',
        url: media.url ?? '',
      })
    } else {
      missingCv.push(String(app.id))
    }
  }

  console.log('  CV media to delete:')
  console.log('  ' + '-'.repeat(66))
  for (const ref of cvRefs) {
    const flag = CV_ALT_PATTERN.test(ref.alt) ? '  ' : '!!'
    console.log(`  ${flag} ${ref.mediaId}  ${ref.alt || '(no alt)'}  [${ref.filename}]`)
  }
  console.log('  ' + '-'.repeat(66))

  if (missingCv.length > 0) {
    console.log(`\n  Note: ${missingCv.length} application(s) had no CV attached: ${missingCv.join(', ')}`)
  }

  // ── 4. Safety net: refuse to touch anything that isn't clearly a CV ────────
  const suspicious = cvRefs.filter((ref) => !CV_ALT_PATTERN.test(ref.alt))
  if (suspicious.length > 0) {
    console.error('')
    console.error('  ABORTING — these media rows do not look like CVs (alt does not match /^CV[—-]/).')
    console.error('  They may be site imagery. Review them by hand before re-running:')
    for (const ref of suspicious) {
      console.error(`    ${ref.mediaId}  alt="${ref.alt}"  file="${ref.filename}"`)
    }
    console.error('')
    process.exitCode = 1
    return
  }

  if (!confirm) {
    console.log('')
    console.log('  DRY RUN — nothing was deleted.')
    console.log(`  Re-run with --confirm to delete ${applications.length} application(s)`)
    console.log(`  and ${cvRefs.length} CV file(s) from Mongo and GCS.`)
    console.log('')
    return
  }

  // ── 5. Delete media first (storage-gcs removes the GCS object), then apps ──
  console.log('\n  Deleting CV media…')
  for (const ref of cvRefs) {
    await payload.delete({
      collection: 'media',
      id: ref.mediaId,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  }

  console.log('  Deleting applications…')
  for (const app of applications) {
    await payload.delete({
      collection: 'job-applications',
      id: String(app.id),
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  }

  // ── 6. Verify the media count moved by exactly the number of CVs ──────────
  const mediaAfter = await payload.count({ collection: 'media', overrideAccess: true })
  const expected = mediaBefore.totalDocs - cvRefs.length

  console.log('')
  console.log(`  Media before : ${mediaBefore.totalDocs}`)
  console.log(`  Media after  : ${mediaAfter.totalDocs}`)
  console.log(`  Expected     : ${expected}`)

  if (mediaAfter.totalDocs !== expected) {
    console.error('\n  WARNING: media count does not match. Inspect the media collection.\n')
    process.exitCode = 1
    return
  }

  console.log('\n  Done.\n')
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
