/**
 * Convert a Tabler icon name to its React component name.
 *
 * Tabler component names = "Icon" + PascalCase của tên icon (kebab-case):
 *   "shield-check" → "IconShieldCheck"
 *   "home"         → "IconHome"
 *   "a-b-2"        → "IconAB2"
 *
 * Nếu đã là dạng component name ("IconHome") thì trả về nguyên vẹn.
 */
export function toIconComponentName(name: string): string {
  if (name.startsWith('Icon')) return name

  return (
    'Icon' +
    name
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  )
}
