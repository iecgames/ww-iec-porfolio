import type { NewsletterSignupBlock as Props } from '@/payload-types'
import { getTranslations } from 'next-intl/server'
import React from 'react'
import { NewsletterSignupClient } from './Client'

export const NewsletterSignupBlock: React.FC<Props & { id?: string }> = async ({
  eyebrow,
  heading,
  subtitle,
  contact,
}) => {
  const t = await getTranslations('NewsletterSignup')

  return (
    <NewsletterSignupClient
      eyebrow={eyebrow}
      heading={heading ?? ''}
      subtitle={subtitle}
      contact={contact}
      labels={{
        namePlaceholder: t('namePlaceholder'),
        emailPlaceholder: t('emailPlaceholder'),
        subjectPlaceholder: t('subjectPlaceholder'),
        messageLabel: t('messageLabel'),
        messagePlaceholder: t('messagePlaceholder'),
        submit: t('submit'),
        submitting: t('submitting'),
        successTitle: t('successTitle'),
        successBody: t('successBody'),
        errorEmail: t('errorEmail'),
        errorRequired: t('errorRequired'),
      }}
    />
  )
}
