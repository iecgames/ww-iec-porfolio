import type { Payload, PayloadRequest } from 'payload'

export type SubscriberSource = 'job_application' | 'form_submission' | 'newsletter' | 'contact'

type UpsertSubscriberArgs = {
  email: string
  name?: string
  source: SubscriberSource
  payload: Payload
  /**
   * Pass from inside a collection hook so the insert joins that request's
   * transaction. Server actions have no such request and correctly omit it.
   */
  req?: PayloadRequest
}

export async function upsertSubscriber({
  email,
  name,
  source,
  payload,
  req,
}: UpsertSubscriberArgs): Promise<void> {
  const existing = await payload.find({
    collection: 'subscribers',
    where: { email: { equals: email } },
    limit: 1,
    pagination: false,
    ...(req ? { req } : {}),
  })

  if (existing.totalDocs > 0) {
    // Already exists — do not overwrite, especially do not re-subscribe
    // someone who has explicitly unsubscribed
    return
  }

  await payload.create({
    collection: 'subscribers',
    data: { email, name, source },
    ...(req ? { req } : {}),
  })
}
