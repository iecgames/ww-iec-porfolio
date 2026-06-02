'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import { IconWorld } from '@tabler/icons-react'
import { useParams } from 'next/navigation'
import React, { useId, useTransition } from 'react'

/** Vietnam flag — red field with a centered yellow star. */
function FlagVN({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden
    >
      <rect width="30" height="20" fill="#DA251D" />
      <path
        fill="#FFFF00"
        d="M15 4l1.763 5.427h5.706l-4.616 3.354 1.763 5.428L15 14.854l-4.616 3.355 1.763-5.428-4.616-3.354h5.706z"
      />
    </svg>
  )
}

/** United Kingdom flag (Union Jack) — represents the English option. */
function FlagGB({ className }: { className?: string }) {
  const raw = useId()
  const id = raw.replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg
      viewBox="0 0 60 30"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden
    >
      <clipPath id={`${id}-t`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}-s`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}-t)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${id}-s)`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}

/** Small rounded flag chip wrapper. */
function FlagBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10">
      {children}
    </span>
  )
}

const locales = [
  { code: 'vi', label: 'Tiếng Việt', Flag: FlagVN },
  { code: 'en', label: 'English', Flag: FlagGB },
] as const

export const LanguageSwitcher: React.FC = () => {
  const params = useParams()
  const rawLocale = Array.isArray(params?.locale) ? params.locale[0] : params?.locale
  const locale = rawLocale === 'vi' ? 'vi' : 'en'
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const switchLocale = (nextLocale: string) => {
    if (nextLocale === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

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
        {locales.map(({ code, label, Flag }) => (
          <DropdownItem
            key={code}
            startContent={
              <FlagBadge>
                <Flag className="h-full w-full" />
              </FlagBadge>
            }
            className={code === locale ? 'font-semibold' : ''}
          >
            {label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
