import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { cookies, draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { PageTransition } from '@/components/PageTransition'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { routing } from '@/i18n/routing'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Enable static rendering and make the active locale available to all
  // server components rendered within this segment (Header, Footer, etc).
  setRequestLocale(locale)

  const { isEnabled } = await draftMode()
  const messages = await getMessages()

  // AdminBar fetches /api/users/me as soon as it mounts. Rendering it for every
  // visitor costs one API round-trip per page view just to conclude the bar
  // should stay hidden, so gate it on the Payload auth cookie being present.
  // This only decides whether to render — PayloadAdminBar still authenticates
  // its own request, so a forged cookie reveals nothing.
  const hasAuthCookie = Boolean((await cookies()).get('payload-token'))

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        {hasAuthCookie && (
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />
        )}

        <Header />
        <PageTransition>{children}</PageTransition>
        <Footer />
      </Providers>
    </NextIntlClientProvider>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
