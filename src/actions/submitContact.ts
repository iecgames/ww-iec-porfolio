'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { upsertSubscriber } from '@/utilities/email/upsertSubscriber'

export type ContactResult = { ok: true } | { ok: false; error: string }

export async function submitContact(formData: FormData): Promise<ContactResult> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const subject = String(formData.get('subject') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()

  if (!name || name.length > 200) {
    return { ok: false, error: 'Please enter your name.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, error: 'Invalid email address.' }
  }
  if (subject.length > 200) {
    return { ok: false, error: 'Subject is too long.' }
  }
  if (!message || message.length > 5000) {
    return { ok: false, error: 'Please enter a message.' }
  }

  const payload = await getPayload({ config: configPromise })

  try {
    await payload.create({
      collection: 'contactSubmissions',
      data: {
        name,
        email,
        subject: subject || undefined,
        message,
      },
      overrideAccess: true,
    })
  } catch (err: unknown) {
    console.error('[submitContact]', err)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  // Enrolling the sender in the newsletter is secondary. They have already
  // written and sent their message, so a failure here must not come back as
  // "sending failed" — log it and let the contact submission stand.
  try {
    await upsertSubscriber({ email, name, source: 'contact', payload })
  } catch (err: unknown) {
    console.error('[submitContact] subscriber upsert failed:', err)
  }

  return { ok: true }
}
