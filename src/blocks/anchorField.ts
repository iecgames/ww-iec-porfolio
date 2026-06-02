import type { Field } from 'payload'

/**
 * Reusable "Anchor ID" field injected into every layout block.
 * Lets editors give a section a stable id so it can be linked directly,
 * e.g. anchor "contact" → /career#contact scrolls straight to that block.
 */
export const anchorField: Field = {
  name: 'anchor',
  type: 'text',
  label: 'Anchor ID',
  admin: {
    description:
      'Optional. Link directly to this section with /path#your-id (e.g. "contact"). Use letters, numbers and hyphens only.',
  },
  validate: (value: string | null | undefined) => {
    if (!value) return true
    return (
      /^[a-zA-Z][a-zA-Z0-9-]*$/.test(value) ||
      'Must start with a letter and contain only letters, numbers and hyphens.'
    )
  },
}

/** Normalise an anchor value into a safe DOM id (defensive — editors may paste anything). */
export const toAnchorId = (raw?: string | null): string | undefined => {
  if (!raw) return undefined
  const id = raw
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return id || undefined
}
