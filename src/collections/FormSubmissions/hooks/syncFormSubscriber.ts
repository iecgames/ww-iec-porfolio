import { upsertSubscriber } from '@/utilities/email/upsertSubscriber'
import type { CollectionAfterChangeHook } from 'payload'

type FormField = { blockType: string; name?: string }

export const syncFormSubscriber: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  try {
    const form = await req.payload.findByID({
      collection: 'forms',
      id: typeof doc.form === 'string' ? doc.form : doc.form?.id,
    })

    if (!form?.fields) return doc

    // Find all fields of type 'email' in the form definition
    const fields = (form.fields ?? []) as FormField[]
    const emailFields = fields.filter((field) => field.blockType === 'email' && field.name)

    if (emailFields.length === 0) return doc

    // Find a name field to use as subscriber name
    const nameField = fields.find(
      (field) => field.blockType !== 'email' && field.name && /name/i.test(field.name),
    )
    const nameValue = nameField?.name
      ? doc.submissionData?.find(
          (d: { field: string; value: string }) => d.field === nameField.name,
        )?.value
      : undefined

    for (const emailField of emailFields) {
      const emailValue = doc.submissionData?.find(
        (d: { field: string; value: string }) => d.field === emailField.name,
      )?.value

      if (!emailValue || typeof emailValue !== 'string') continue

      await upsertSubscriber({
        email: emailValue,
        name: nameValue,
        source: 'form_submission',
        payload: req.payload,
        req,
      })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[syncFormSubscriber] Failed to upsert subscriber:', err)
  }

  return doc
}
