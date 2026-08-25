/**
 * One-off purge of the form-builder collections, ahead of removing the plugin.
 *
 * MUST run while formBuilderPlugin is still registered in src/plugins/index.ts:
 * once the config no longer declares `forms` and `form-submissions`, Payload
 * cannot query them and this script has nothing to work with.
 *
 * Submissions are deleted before forms — a submission references its form, so
 * removing forms first would strand them with no way left to identify them.
 *
 * Dry-run by default. Pass --confirm to actually delete.
 *
 *   pnpm purge:forms
 *   pnpm purge:forms -- --confirm
 */
import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

async function main() {
  const confirm = process.argv.slice(2).includes('--confirm')
  const payload = await getPayload({ config })

  const submissions = await payload.find({
    collection: 'form-submissions',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const forms = await payload.find({
    collection: 'forms',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  // Untouched collections, counted before and after as a guard.
  const contactsBefore = await payload.count({
    collection: 'contactSubmissions',
    overrideAccess: true,
  })
  const subsBefore = await payload.count({ collection: 'subscribers', overrideAccess: true })

  console.log('')
  console.log('═'.repeat(64))
  console.log(`  form-submissions   : ${submissions.totalDocs}`)
  console.log(`  forms              : ${forms.totalDocs}`)
  console.log('  ' + '-'.repeat(60))
  console.log(`  contactSubmissions : ${contactsBefore.totalDocs}  (must not change)`)
  console.log(`  subscribers        : ${subsBefore.totalDocs}  (must not change)`)
  console.log('═'.repeat(64))

  if (forms.totalDocs === 0 && submissions.totalDocs === 0) {
    console.log('\nNothing to purge.\n')
    return
  }

  console.log('\n  Forms to delete:')
  for (const f of forms.docs) {
    console.log(`    ${String(f.id)}  ${JSON.stringify((f as { title?: string }).title ?? '')}`)
  }

  console.log('\n  Submissions to delete:')
  for (const s of submissions.docs) {
    const formRef = (s as { form?: unknown }).form
    console.log(`    ${String(s.id)}  form=${String(formRef ?? '(none)')}`)
  }

  if (!confirm) {
    console.log('')
    console.log('  DRY RUN — nothing was deleted.')
    console.log('  Re-run with --confirm to delete.')
    console.log('')
    return
  }

  console.log('\n  Deleting submissions…')
  for (const s of submissions.docs) {
    await payload.delete({
      collection: 'form-submissions',
      id: s.id,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  }

  console.log('  Deleting forms…')
  for (const f of forms.docs) {
    await payload.delete({
      collection: 'forms',
      id: f.id,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  }

  const formsAfter = await payload.count({ collection: 'forms', overrideAccess: true })
  const subsAfterCount = await payload.count({
    collection: 'form-submissions',
    overrideAccess: true,
  })
  const contactsAfter = await payload.count({
    collection: 'contactSubmissions',
    overrideAccess: true,
  })
  const subscribersAfter = await payload.count({ collection: 'subscribers', overrideAccess: true })

  console.log('')
  console.log(`  forms              : ${formsAfter.totalDocs}  (expected 0)`)
  console.log(`  form-submissions   : ${subsAfterCount.totalDocs}  (expected 0)`)
  console.log(
    `  contactSubmissions : ${contactsAfter.totalDocs}  (expected ${contactsBefore.totalDocs})`,
  )
  console.log(
    `  subscribers        : ${subscribersAfter.totalDocs}  (expected ${subsBefore.totalDocs})`,
  )

  const ok =
    formsAfter.totalDocs === 0 &&
    subsAfterCount.totalDocs === 0 &&
    contactsAfter.totalDocs === contactsBefore.totalDocs &&
    subscribersAfter.totalDocs === subsBefore.totalDocs

  console.log(ok ? '\n  Done.\n' : '\n  WARNING: counts do not match — inspect the database.\n')
  if (!ok) process.exitCode = 1
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
