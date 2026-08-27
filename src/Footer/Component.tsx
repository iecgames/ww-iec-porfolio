import type { Social } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getCachedSocials } from '@/utilities/getSocials'
import { getLocale, getTranslations } from 'next-intl/server'
import React from 'react'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { Divider } from '@heroui/react'
import {
  IconBrandDiscord,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandTwitter,
  IconBrandYoutube,
  IconMail,
  IconPhone,
} from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'

const ICON_CLS = 'w-6 h-6'

function SocialIcon({ platform }: { platform: Social['platform'] }) {
  switch (platform) {
    case 'linkedin':
      return <IconBrandLinkedin className={ICON_CLS} />
    case 'facebook':
      return <IconBrandFacebook className={ICON_CLS} />
    case 'instagram':
      return <IconBrandInstagram className={ICON_CLS} />
    case 'youtube':
      return <IconBrandYoutube className={ICON_CLS} />
    case 'twitter':
      return <IconBrandTwitter className={ICON_CLS} />
    case 'tiktok':
      return <IconBrandTiktok className={ICON_CLS} />
    case 'discord':
      return <IconBrandDiscord className={ICON_CLS} />
    default:
      return null
  }
}

function getSocialBrandColor(platform: Social['platform']): string {
  switch (platform) {
    case 'youtube':
      return '#FF0000'
    case 'instagram':
      return '#E1306C'
    case 'facebook':
      return '#1877F2'
    case 'linkedin':
      return '#0A66C2'
    case 'twitter':
      return '#1DA1F2'
    case 'tiktok':
      return '#010101'
    case 'discord':
      return '#5865F2'
    default:
      return '#000000'
  }
}

export async function Footer() {
  const locale = (await getLocale()) as 'en' | 'vi'
  const t = await getTranslations('Footer')
  const [footerData, generalData, socials] = await Promise.all([
    getCachedGlobal('footer', 1, locale)(),
    getCachedGlobal('general', 1, locale)(),
    getCachedSocials()(),
  ])
  const navItems = footerData?.navItems || []

  // Contact button — value comes from General Settings (hotline or email)
  const contactType = footerData?.contactType ?? 'phone'
  const contactValue = contactType === 'email' ? generalData?.email : generalData?.hotline
  const contactHref = contactType === 'email' ? `mailto:${contactValue}` : `tel:${contactValue}`

  // Resolve logo from General Settings. The footer prefers the dedicated mono
  // logo (designed for the dark background, shown as-is); only when it's absent
  // do we fall back to the regular logo and force it white via a CSS filter.
  const resolveMedia = (value: unknown) =>
    value && typeof value === 'object'
      ? (value as {
          url?: string
          alt?: string
          width?: number
          height?: number
          updatedAt?: string
        })
      : null
  const monoMedia = resolveMedia(generalData?.logoMono)
  const logoMedia = resolveMedia(generalData?.logo)
  const activeMedia = monoMedia ?? logoMedia
  const logoSrc = activeMedia?.url ?? null
  const logoAlt = activeMedia?.alt || (generalData?.companyName as string | undefined) || 'IEC Logo'
  // Mono logo renders untouched; the fallback colored logo gets inverted to white.
  const logoClassName = monoMedia ? 'h-20' : 'brightness-0 invert h-20'

  return (
    <footer
      className="mt-auto"
      style={{ fontFamily: 'var(--font-space-grotesk, system-ui, sans-serif)' }}
    >
      {/* Top section — company info */}
      {(generalData?.companyName ||
        generalData?.address ||
        generalData?.hotline ||
        generalData?.email) && (
        <div className="border-t border-white/10" style={{ backgroundColor: '#0a4bb1' }}>
          <div className="container py-10 flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
            {/* Company info + socials */}
            <div className="flex-1">
              {generalData.companyName && (
                <p className="font-bold text-sm text-white mb-3">{generalData.companyName}</p>
              )}
              <div className="flex flex-col gap-1 text-sm text-white/80">
                {generalData.address && (
                  <p>
                    {t('headOffice')}: {generalData.address}
                  </p>
                )}
                {generalData.hotline && (
                  <p>
                    {t('hotline')}: {generalData.hotline}
                  </p>
                )}
                {generalData.email && (
                  <p>
                    {t('email')}: {generalData.email}
                  </p>
                )}
              </div>
              {socials.length > 0 && (
                <div className="flex items-center gap-2 mt-5">
                  {socials.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-0 ring-white/40 transition-all duration-300 hover:scale-110 hover:ring-white/70"
                      aria-label={s.platform}
                    >
                      {/* Fill circle scales from center on hover — no layout shift */}
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-white scale-0 transition-transform duration-300 group-hover:scale-100"
                      />
                      {/* Default: white icon */}
                      <span className="relative z-10 text-white transition-opacity duration-200 group-hover:opacity-0">
                        <SocialIcon platform={s.platform} />
                      </span>
                      {/* Hover: brand-colored icon */}
                      <span
                        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{ color: getSocialBrandColor(s.platform) }}
                      >
                        <SocialIcon platform={s.platform} />
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            {/* Logo */}
            <div className="shrink-0 flex flex-col items-start md:items-end gap-3">
              <Link href="/" className="inline-block">
                {/* No eager/high here: the footer logo is always below the fold,
                    and preloading it at high priority made half a megabyte of PNG
                    compete with the LCP image for bandwidth. */}
                <Logo
                  src={logoSrc}
                  alt={logoAlt}
                  size="large"
                  className={logoClassName}
                  imgWidth={activeMedia?.width ?? null}
                  imgHeight={activeMedia?.height ?? null}
                  cacheTag={activeMedia?.updatedAt ?? null}
                />
              </Link>
              {generalData.description && (
                <p className="text-xs md:text-sm text-white/75 leading-relaxed max-w-xs whitespace-pre-line md:text-right">
                  {generalData.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Divider className="bg-[#0a4bb1]/90" />

      {/* Bottom bar */}
      <div className="text-white" style={{ backgroundColor: '#0a4bb1' }}>
        <div className="container py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left — copyright + nav links */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
            {footerData?.copyright && <span>{footerData.copyright}</span>}
            {footerData?.copyright && navItems.length > 0 && (
              <span className="text-white/40">—</span>
            )}
            {navItems.map(({ link }, i) => (
              <React.Fragment key={i}>
                <CMSLink className="text-white/75 hover:text-white transition-colors" {...link} />
                {i < navItems.length - 1 && <span className="text-white/40">—</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Right — contact button */}
          <div className="flex items-center gap-4">
            {footerData?.contactLabel && contactValue && (
              <a
                href={contactHref}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/40 text-sm text-white hover:bg-white/15 transition-colors whitespace-nowrap"
              >
                {contactType === 'email' ? (
                  <IconMail className="w-4 h-4" />
                ) : (
                  <IconPhone className="w-4 h-4" />
                )}
                {footerData.contactLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
