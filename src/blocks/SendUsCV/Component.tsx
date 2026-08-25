import type { SendUsCVBlock as SendUsCVBlockProps } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getCachedSocials } from '@/utilities/getSocials'
import { getLocale, getTranslations } from 'next-intl/server'
import React from 'react'
import { SendUsCVClient, type ApplyLabels, type SocialItem } from './SendUsCVClient'

export const SendUsCVBlock: React.FC<SendUsCVBlockProps & { id?: string }> = async ({
  heading,
  subtitle,
  cvUrl,
  innovatorLabel,
}) => {
  const locale = (await getLocale()) as 'en' | 'vi'
  const t = await getTranslations('JobDetail')
  const [general, socialDocs] = await Promise.all([
    getCachedGlobal('general', 0, locale)(),
    getCachedSocials()(),
  ])
  const recruitmentEmail = general?.recruitmentEmail ?? null

  const socials: SocialItem[] = socialDocs.map((doc) => ({
    id: String(doc.id),
    platform: doc.platform,
    url: doc.url,
  }))

  const applyLabels: ApplyLabels = {
    triggerLabel: t('sendCV.trigger'),
    title: t('sendCV.title'),
    subtitle: t('sendCV.subtitle'),
    fullName: t('apply.fullName'),
    email: t('apply.email'),
    phone: t('apply.phone'),
    position: t('sendCV.position'),
    positionPlaceholder: t('sendCV.positionPlaceholder'),
    experience: t('apply.experience'),
    additionalLink: t('apply.additionalLink'),
    additionalLinkPlaceholder: t('apply.additionalLinkPlaceholder'),
    additionalLinkHint: t('apply.additionalLinkHint'),
    cv: t('apply.cv'),
    cvHint: t('apply.cvHint'),
    close: t('apply.close'),
    required: t('apply.required'),
    disabledTitle: t('apply.disabledNotice.title'),
    disabledBody: t('apply.disabledNotice.body', {
      email: recruitmentEmail ?? 'hr@iecorp.vn',
    }),
    disabledMailButton: t('apply.disabledNotice.mailButton'),
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      <SendUsCVClient
        heading={heading ?? undefined}
        subtitle={subtitle ?? undefined}
        cvUrl={cvUrl ?? undefined}
        innovatorLabel={innovatorLabel ?? undefined}
        socials={socials}
        applyLabels={applyLabels}
        recruitmentEmail={recruitmentEmail}
      />
    </div>
  )
}
