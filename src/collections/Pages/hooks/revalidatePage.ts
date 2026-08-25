import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Page } from '../../../payload-types'

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    // The [slug] route caches published pages under the `pages` tag. Fired on
    // every change, not just publishes: unpublishing must drop the cache too.
    setImmediate(() => {
      revalidateTag('pages', 'max')
    })

    if (doc._status === 'published') {
      const path = doc.slug === 'home' ? '/' : `/${doc.slug}`

      payload.logger.info(`Revalidating page at path: ${path}`)

      setImmediate(() => {
        revalidatePath(path)
        revalidateTag('pages-sitemap', 'max')
      })
    }

    // If the page was previously published, we need to revalidate the old path
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const oldPath = previousDoc.slug === 'home' ? '/' : `/${previousDoc.slug}`

      payload.logger.info(`Revalidating old page at path: ${oldPath}`)

      setImmediate(() => {
        revalidatePath(oldPath)
        revalidateTag('pages-sitemap', 'max')
      })
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    const path = doc?.slug === 'home' ? '/' : `/${doc?.slug}`
    setImmediate(() => {
      revalidatePath(path)
      revalidateTag('pages-sitemap', 'max')
      revalidateTag('pages', 'max')
    })
  }

  return doc
}
