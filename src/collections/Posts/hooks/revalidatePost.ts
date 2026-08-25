import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post } from '../../../payload-types'

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    // Blocks that list posts (archive, category showcase, IEC life) read through
    // caches tagged `posts`. Any change can reorder or drop a listing entry, so
    // this fires regardless of publish status.
    setImmediate(() => {
      revalidateTag('posts', 'max')
    })

    if (doc._status === 'published') {
      const path = `/posts/${doc.slug}`

      payload.logger.info(`Revalidating post at path: ${path}`)

      setImmediate(() => {
        revalidatePath(path)
        revalidateTag('posts-sitemap', 'max')
      })
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/posts/${previousDoc.slug}`

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      setImmediate(() => {
        revalidatePath(oldPath)
        revalidateTag('posts-sitemap', 'max')
      })
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    const path = `/posts/${doc?.slug}`

    setImmediate(() => {
      revalidatePath(path)
      revalidateTag('posts-sitemap', 'max')
      revalidateTag('posts', 'max')
    })
  }

  return doc
}
