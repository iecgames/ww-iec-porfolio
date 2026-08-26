import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Job } from '../../../payload-types'

export const revalidateJob: CollectionAfterChangeHook<Job> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const detailPath = `/career/${doc.id}`
    payload.logger.info(`Revalidating job at path: ${detailPath}`)
    setImmediate(() => {
      try {
        revalidatePath(detailPath)
        revalidatePath('/career')
        // JobBoard and CareersHighlight read through caches tagged `jobs`
        revalidateTag('jobs', 'max')
      } catch {
        // revalidatePath requires a Next.js request context; ignore when called outside it
      }
    })
  }
  return doc
}

export const revalidateJobDelete: CollectionAfterDeleteHook<Job> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    setImmediate(() => {
      try {
        revalidatePath(`/career/${doc?.id}`)
        revalidatePath('/career')
        revalidateTag('jobs', 'max')
      } catch {
        // revalidatePath requires a Next.js request context; ignore when called outside it
      }
    })
  }
  return doc
}
