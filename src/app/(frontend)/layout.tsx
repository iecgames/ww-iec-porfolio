import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { Space_Grotesk } from 'next/font/google'
import React from 'react'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

import { getDefaultSEO } from '@/utilities/getDefaultSEO'
import { getLocale } from 'next-intl/server'

import { getServerSideURL } from '@/utilities/getURL'
import './globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html className={cn(spaceGrotesk.variable, GeistMono.variable)} lang={locale}>
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as 'en' | 'vi'

  return {
    metadataBase: new URL(getServerSideURL()),
    ...(await getDefaultSEO(locale)),
  }
}
