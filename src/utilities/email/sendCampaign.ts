import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { PayloadRequest } from 'payload'

import { getCachedEmailTemplates } from './getEmailTemplates'
import { getEmailSiteUrl } from './getEmailSiteUrl'
import { getUnsubscribeUrl } from './getUnsubscribeUrl'
import { baseTemplate } from './templates/base'
import { newJobTemplate } from './templates/newJob'
import { newPostTemplate } from './templates/newPost'

const BATCH_SIZE = 50
const BATCH_DELAY_MS = 200
const PAGE_LIMIT = 100

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveTokens(input: string, data: Record<string, string>): string {
  return input.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => data[key] ?? '')
}

function lexicalToHtml(body: unknown): string {
  if (!body) return ''
  try {
    return convertLexicalToHTML({
      data: body as Parameters<typeof convertLexicalToHTML>[0]['data'],
      disableContainer: true,
    })
  } catch {
    return ''
  }
}

/** Absolute URL for the site logo — email clients cannot resolve relative paths. */
function resolveLogoUrl(logo: unknown, siteUrl: string): string | undefined {
  if (!logo || typeof logo !== 'object') return undefined
  const url = (logo as { url?: string | null }).url
  if (!url) return undefined
  return url.startsWith('http') ? url : `${siteUrl}${url}`
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

  // 4. Editor-configured content, plus the logo for the shared layout
  const templates = await getCachedEmailTemplates()()
  const general = await payload.findGlobal({ slug: 'general', depth: 1 })
  const logoUrl = resolveLogoUrl(general?.logo, siteUrl)

  const template = campaign.type === 'new_post' ? templates?.newPost : templates?.newJob

  const previewText = template?.previewText || undefined

  // 5. Resolve the related document and its tokens
  const docTokens: Record<string, string> = {}
  if (
    campaign.type === 'new_post' &&
    campaign.relatedPost &&
    typeof campaign.relatedPost === 'object'
  ) {
    const post = campaign.relatedPost as { title?: string; slug?: string }
    docTokens['post.title'] = String(post.title ?? '')
    docTokens['post.url'] = `${siteUrl}/posts/${post.slug ?? ''}`
  } else if (
    campaign.type === 'new_job' &&
    campaign.relatedJob &&
    typeof campaign.relatedJob === 'object'
  ) {
    const job = campaign.relatedJob as { id: string | number; title?: string }
    docTokens['job.title'] = String(job.title ?? '')
    docTokens['job.url'] = `${siteUrl}/career/${job.id}`
  }

  // Subject priority: global template → campaign → the built-in layout's default
  let resolvedSubject = resolveTokens(template?.subject || campaign.subject || '', docTokens)

  // 6. Body: the global template, falling back to the built-in layout.
  // The fallback matters: an unconfigured global must not mail empty bodies.
  const configuredBodyHtml = lexicalToHtml(template?.body)
  const prerenderedBodyHtml = configuredBodyHtml
    ? resolveTokens(configuredBodyHtml, docTokens)
    : ''

  // 7. Fetch all active subscribers (paginated)
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

  // 8. Send in batches
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

        if (prerenderedBodyHtml) {
          const subscriberBody = resolveTokens(prerenderedBodyHtml, {
            'subscriber.name': subscriber.name ?? '',
          })
          html = baseTemplate({ bodyHtml: subscriberBody, unsubscribeUrl, siteUrl, previewText, logoUrl })
        } else if (
          campaign.type === 'new_job' &&
          campaign.relatedJob &&
          typeof campaign.relatedJob === 'object'
        ) {
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
            previewText,
            logoUrl,
          })
          html = result.html
          if (!subject) subject = result.subject
        } else if (
          campaign.type === 'new_post' &&
          campaign.relatedPost &&
          typeof campaign.relatedPost === 'object'
        ) {
          const post = campaign.relatedPost as { title?: string; slug?: string }
          const result = newPostTemplate({
            post: { title: String(post.title ?? ''), slug: String(post.slug ?? '') },
            subscriber,
            unsubscribeUrl,
            siteUrl,
            previewText,
            logoUrl,
          })
          html = result.html
          if (!subject) subject = result.subject
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

  // 9. Mark as sent
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
