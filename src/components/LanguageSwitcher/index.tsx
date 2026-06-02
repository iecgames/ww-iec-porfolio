'use client'

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import { IconWorld } from '@tabler/icons-react'
import { usePathname, useRouter } from 'next/navigation'
import React, { useTransition } from 'react'

export const locales = [
  {
    code: 'vi',
    label: 'Tiếng Việt',
    flag: '/flags/vn.svg',
  },
  {
    code: 'en',
    label: 'English',
    flag: '/flags/gb.svg',
  },
] as const

const LOCALE_CODES: readonly string[] = locales.map((l) => l.code)

/** Small rounded flag chip. */
export function FlagBadge({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </span>
  )
}

/** Shared locale state + switch logic (preserves the current path, swaps the prefix). */
export function useLocaleSwitcher() {
  const router = useRouter()
  // Real URL pathname incl. the locale prefix, e.g. "/vi/career".
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const segments = pathname.split('/')
  const locale = segments[1] === 'vi' ? 'vi' : 'en'

  const switchLocale = (nextLocale: string) => {
    if (nextLocale === locale) return
    const next = pathname.split('/')
    if (LOCALE_CODES.includes(next[1])) {
      next[1] = nextLocale
    } else {
      next.splice(1, 0, nextLocale)
    }
    const target = next.join('/') || '/'
    startTransition(() => {
      router.replace(target)
    })
  }

  return { locale, switchLocale, isPending }
}

export const LanguageSwitcher: React.FC = () => {
  const { locale, switchLocale, isPending } = useLocaleSwitcher()

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button
          type="button"
          disabled={isPending}
          aria-label="Change language"
          className="inline-flex items-center justify-center rounded-full p-2 text-foreground transition-colors hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <IconWorld size={20} />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Language selection"
        selectionMode="single"
        selectedKeys={new Set([locale])}
        onAction={(key) => switchLocale(String(key))}
      >
        {locales.map(({ code, label, flag }) => (
          <DropdownItem
            key={code}
            startContent={<FlagBadge src={flag} alt={label} />}
            className={code === locale ? 'font-semibold' : ''}
          >
            {label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
