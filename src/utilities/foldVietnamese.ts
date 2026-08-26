/**
 * Fold Vietnamese text into a diacritic-free, lowercase form for searching.
 *
 * Solves two problems at once:
 *
 * 1. **Normalization mismatch.** Text stored by the CMS is NFC ("ọ" as U+1ECD),
 *    but a macOS keyboard or some IMEs produce NFD ("o" + U+0323). A regex
 *    built from one form never matches the other. Normalizing to NFD first
 *    puts every input on the same footing.
 * 2. **Accent-insensitive search.** Vietnamese users routinely type without
 *    tone marks — "hoa si" should find "Họa sĩ".
 *
 * `đ`/`Đ` are precomposed letters in their own right, not a base plus a
 * combining mark, so NFD leaves them intact and they need an explicit mapping.
 * Miss that and "dong" fails to match "đông".
 */
export function foldVietnamese(input: string): string {
  return input
    .normalize('NFD')
    // Strip combining diacritical marks (U+0300–U+036F).
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
