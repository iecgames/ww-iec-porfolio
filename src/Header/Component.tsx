import { getCachedGlobal } from '@/utilities/getGlobals'
import { getLocale } from 'next-intl/server'
import { HeaderClient } from './Component.client'

export async function Header() {
  const locale = (await getLocale()) as 'en' | 'vi'
  const [headerData, generalData] = await Promise.all([
    getCachedGlobal('header', 1, locale)(),
    getCachedGlobal('general', 1, locale)(),
  ])

  const logoMedia =
    generalData?.logo && typeof generalData.logo === 'object'
      ? (generalData.logo as { url?: string; alt?: string; width?: number; height?: number })
      : null

  return (
    <HeaderClient
      data={headerData}
      logoSrc={logoMedia?.url ?? null}
      logoAlt={logoMedia?.alt || (generalData?.companyName as string | undefined) || 'IEC'}
    />
  )
}
