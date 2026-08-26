import type { EmailTemplate } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

/**
 * Editor-configured content for the automatic notification emails.
 * Invalidated by revalidateEmailTemplates when the global is saved.
 */
export const getCachedEmailTemplates = () =>
  unstable_cache(
    async (): Promise<EmailTemplate> => {
      const payload = await getPayload({ config: configPromise })
      return payload.findGlobal({ slug: 'email-templates', depth: 0 })
    },
    ['email-templates'],
    { tags: ['global_email-templates'] },
  )
