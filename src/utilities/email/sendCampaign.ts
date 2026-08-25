import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { PayloadRequest } from 'payload'

import { getEmailSiteUrl } from './getEmailSiteUrl'
import { getUnsubscribeUrl } from './getUnsubscribeUrl'
import { baseTemplate } from './templates/base'
import { manualTemplate } from './templates/manual'
import { newJobTemplate } from './templates/newJob'
import { newPostTemplate } from './templates/newPost'

const BATCH_SIZE = 50
const BATCH_DELAY_MS = 200
const PAGE_LIMIT = 100

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveSubjectTokens(subject: string, data: Record<string, string>): string {
  return subject.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => data[key] ?? '')
}

export async function sendCampaign({
  campaignId,
  req,
}: {
  campaignId: string
  req: PayloadRequest
}): Promise<{ recipientCount: number }> {
  const { payload } = req

  // 1. Fetch campaign
  const campaign = await payload.findByID({
    collection: 'email-campaigns',
    id: campaignId,
    depth: 2,
    overrideAccess: true,
  })

  // 2. Guard: only draft campaigns can be sent
  if (campaign.status !== 'draft') {
    throw new Error('Campaign already sent or currently sending')
  }

  // 3. Mark as sending
  await payload.update({
    collection: 'email-campaigns',
    id: campaignId,
    data: { status: 'sending' },
    overrideAccess: true,
  })

  const siteUrl = getEmailSiteUrl()

  // 4. Resolve subject tokens
  let resolvedSubject = campaign.subject ?? ''
  if (
    campaign.type === 'new_job' &&
    campaign.relatedJob &&
    typeof campaign.relatedJob === 'object'
  ) {
    const job = campaign.relatedJob as { id: string | number; title?: string }
    resolvedSubject = resolveSubjectTokens(resolvedSubject, {
      'job.title': String(job.title ?? ''),
    })
  } else if (
    campaign.type === 'new_post' &&
    campaign.relatedPost &&
    typeof campaign.relatedPost === 'object'
  ) {
    const post = campaign.relatedPost as { title?: string }
    resolvedSubject = resolveSubjectTokens(resolvedSubject, {
      'post.title': String(post.title ?? ''),
    })
  }

  // 5. Fetch all active subscribers (paginated)
  let page = 1
  let hasMore = true
  const allSubscribers: Array<{
    id: string | number
    email: string
    name?: string | null
    unsubscribeToken?: string | null
  }> = []

  while (hasMore) {
    const result = await payload.find({
      collection: 'subscribers',
      where: { subscribed: { equals: true } },
      limit: PAGE_LIMIT,
      page,
      overrideAccess: true,
    })

    allSubscribers.push(
      ...result.docs.map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name ?? null,
        unsubscribeToken: (s as { unsubscribeToken?: string }).unsubscribeToken ?? null,
      })),
    )

    hasMore = page < result.totalPages
    page++
  }

  // 6. Convert Lexical body to HTML (all types — admin can override auto templates with a custom body)
  let prerenderedBodyHtml = ''
  if (campaign.body) {
    try {
      prerenderedBodyHtml = convertLexicalToHTML({
        data: campaign.body as Parameters<typeof convertLexicalToHTML>[0]['data'],
        disableContainer: true,
      })
    } catch {
      prerenderedBodyHtml = ''
    }
  }

  // Replace global (non-subscriber) tokens in custom body before the batch loop
  if (prerenderedBodyHtml) {
    if (
      campaign.type === 'new_post' &&
      campaign.relatedPost &&
      typeof campaign.relatedPost === 'object'
    ) {
      const post = campaign.relatedPost as {
        title?: string
        excerpt?: string | null
        slug?: string
      }
      const postUrl = `${siteUrl}/posts/${post.slug ?? ''}`
      prerenderedBodyHtml = resolveSubjectTokens(prerenderedBodyHtml, {
        'post.title': String(post.title ?? ''),
        'post.url': postUrl,
        'post.excerpt': String(post.excerpt ?? ''),
      })
    } else if (
      campaign.type === 'new_job' &&
      campaign.relatedJob &&
      typeof campaign.relatedJob === 'object'
    ) {
      const job = campaign.relatedJob as { id: string | number; title?: string }
      const jobUrl = `${siteUrl}/career/${job.id}`
      prerenderedBodyHtml = resolveSubjectTokens(prerenderedBodyHtml, {
        'job.title': String(job.title ?? ''),
        'job.url': jobUrl,
      })
    }
  }

  // 7. Send in batches
  let totalSent = 0

  for (let i = 0; i < allSubscribers.length; i += BATCH_SIZE) {
    const batch = allSubscribers.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (subscriber) => {
        const unsubscribeUrl = subscriber.unsubscribeToken
          ? getUnsubscribeUrl(subscriber.unsubscribeToken)
          : `${siteUrl}/unsubscribe`

        let html = ''
        let subject = resolvedSubject

        if (
          campaign.type === 'new_job' &&
          campaign.relatedJob &&
          typeof campaign.relatedJob === 'object'
        ) {
          if (prerenderedBodyHtml) {
            // Admin-supplied custom body — replace per-subscriber tokens and wrap in base template
            const subscriberBody = resolveSubjectTokens(prerenderedBodyHtml, {
              'subscriber.name': subscriber.name ?? '',
            })
            html = baseTemplate({ bodyHtml: subscriberBody, unsubscribeUrl, siteUrl })
          } else {
            const job = campaign.relatedJob as {
              id: string | number
              title?: string
              description?: string
            }
            const result = newJobTemplate({
              job: { id: job.id, title: String(job.title ?? ''), description: job.description },
              subscriber,
              unsubscribeUrl,
              siteUrl,
            })
            html = result.html
            if (!subject) subject = result.subject
          }
        } else if (
          campaign.type === 'new_post' &&
          campaign.relatedPost &&
          typeof campaign.relatedPost === 'object'
        ) {
          if (prerenderedBodyHtml) {
            // Admin-supplied custom body — replace per-subscriber tokens and wrap in base template
            const subscriberBody = resolveSubjectTokens(prerenderedBodyHtml, {
              'subscriber.name': subscriber.name ?? '',
            })
            html = baseTemplate({ bodyHtml: subscriberBody, unsubscribeUrl, siteUrl })
          } else {
            const post = campaign.relatedPost as {
              title?: string
              excerpt?: string | null
              slug?: string
            }
            const result = newPostTemplate({
              post: {
                title: String(post.title ?? ''),
                excerpt: post.excerpt,
                slug: String(post.slug ?? ''),
              },
              subscriber,
              unsubscribeUrl,
              siteUrl,
            })
            html = result.html
            if (!subject) subject = result.subject
          }
        } else {
          // manual
          const result = manualTemplate({
            subject,
            bodyHtml: prerenderedBodyHtml,
            subscriber,
            unsubscribeUrl,
            siteUrl,
          })
          html = result.html
        }

        await req.payload.sendEmail({
          to: subscriber.email,
          subject,
          html,
        })
        totalSent++
      }),
    )

    // Delay between batches (skip after last batch)
    if (i + BATCH_SIZE < allSubscribers.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  // 8. Mark as sent
  await payload.update({
    collection: 'email-campaigns',
    id: campaignId,
    data: {
      status: 'sent',
      sentAt: new Date().toISOString(),
      recipientCount: totalSent,
    },
    overrideAccess: true,
  })

  return { recipientCount: totalSent }
}
