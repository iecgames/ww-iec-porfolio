'use client'

import dynamic from 'next/dynamic'
import React, { type ComponentType } from 'react'

import { toIconComponentName } from '@/utilities/tablerIcon'

export type TablerIconProps = {
  size?: number | string
  stroke?: number | string
  color?: string
  className?: string
}

// Cache the lazy components per icon so we don't recreate them on every render.
const iconCache = new Map<string, ComponentType<TablerIconProps>>()

/**
 * Render a single Tabler icon by name (kebab-case "shield-check" or component name "IconShieldCheck").
 *
 * Mỗi icon được nạp bằng dynamic import riêng → bundle ở frontend chỉ chứa icon thực sự được dùng,
 * không kéo theo toàn bộ ~5000 icon của @tabler/icons-react.
 */
export const TablerIcon: React.FC<{ name?: string | null } & TablerIconProps> = ({
  name,
  ...props
}) => {
  if (!name) return null

  const componentName = toIconComponentName(name)

  let Icon = iconCache.get(componentName)
  if (!Icon) {
    Icon = dynamic(
      () =>
        import(`@tabler/icons-react/dist/esm/icons/${componentName}.mjs`).catch(() => ({
          default: () => null,
        })),
      { ssr: true },
    ) as ComponentType<TablerIconProps>
    iconCache.set(componentName, Icon)
  }

  return <Icon {...props} />
}
