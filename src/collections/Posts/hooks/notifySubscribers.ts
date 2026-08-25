import type { CollectionAfterChangeHook } from 'payload'

import type { Post } from '../../../payload-types'
import { sendCampaign } from '../../../utilities/email/sendCampaign'

export const notifyPostSubscribers: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  // Maintenance scripts (backfills, migrations) rewrite documents wholesale and
  // must never mail subscribers as a side effect.
  if (req.context?.skipNotifications) return doc

  // Only fire when transitioning to published for the first time
  const isNowPublished = doc._status === 'published'
  const wasAlreadyPublished = previousDoc?._status === 'published'

  if (!isNowPublished) return doc
  if (operation === 'update' && wasAlreadyPublished) return doc
  if (doc.notifySubscribers === false) return doc

  try {
    const campaign = await req.payload.create({
      collection: 'email-campaigns',
      data: {
        name: `[Auto] New Post: ${doc.title}`,
        subject: `Bài viết mới: {{post.title}}`,
        type: 'new_post',
        relatedPost: doc.id,
        status: 'draft',
      },
      overrideAccess: true,
      req,
    })

    await sendCampaign({ campaignId: String(campaign.id), req })
  } catch (error) {
    console.error('[notifyPostSubscribers] Failed to send campaign:', error)
    // Do not throw — must not block the Payload save operation
  }

  return doc
}
