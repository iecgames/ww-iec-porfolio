import React from 'react'

import { getRegisteredIcon, type TablerIconComponent } from './iconRegistry'

export type TablerIconProps = {
  size?: number | string
  stroke?: number | string
  color?: string
  className?: string
}

export type { TablerIconComponent }

/**
 * Render a single Tabler icon by its CMS name (kebab-case, e.g. "shield-check").
 *
 * Looks the icon up in the static registry. An unknown name renders nothing —
 * same outcome as the previous implementation, whose dynamic import fell back to
 * a null component on failure.
 *
 * This used to be a client component that lazy-loaded each icon via
 * `import(...${name}.mjs)`. That path made the bundler emit a chunk per icon for
 * all 6,090 of them plus an initial-load manifest mapping name to chunk; see
 * `./iconRegistry` for the measurements. With a static registry there is no
 * loading state left, so the component renders on the server and the icon markup
 * ships inside the HTML instead of costing a round trip and hydration.
 */
export const TablerIcon: React.FC<{ name?: string | null } & TablerIconProps> = ({
  name,
  ...props
}) => {
  if (!name) return null

  const Icon = getRegisteredIcon(name)
  if (!Icon) return null

  return <Icon {...props} />
}
