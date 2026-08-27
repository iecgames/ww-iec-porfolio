/**
 * Date formatting pinned to a single timezone.
 *
 * Every formatter here used to be `new Date(ts).getDate()` and friends, which
 * read the *host* timezone. The server runs in UTC and visitors are in UTC+7,
 * so any timestamp between 17:00 and 24:00 UTC rendered as one day on the server
 * and the next day in the browser. React saw the text change under it during
 * hydration and threw #418, then re-rendered the tree on the client — measured
 * on production at /en, /vi and /en/posts, where every date was off by exactly
 * one day.
 *
 * Pinning the zone makes both sides agree. Asia/Ho_Chi_Minh is also the zone the
 * dates are meaningful in: a post published the evening of the 6th local time
 * should read as the 6th, not the 5th.
 */

const SITE_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SITE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

type DateParts = { DD: string; MM: string; YYYY: string }

/** Zero-padded day/month/year in SITE_TIME_ZONE, or null when unparseable. */
export function getDatePartsInSiteZone(timestamp?: string | null): DateParts | null {
  if (!timestamp) return null

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null

  const parts = formatter.formatToParts(date)
  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  const DD = find('day')
  const MM = find('month')
  const YYYY = find('year')
  if (!DD || !MM || !YYYY) return null

  return { DD, MM, YYYY }
}

/** `DD.MM.YYYY` — post cards and the featured post. */
export function formatDateDot(timestamp?: string | null): string {
  const parts = getDatePartsInSiteZone(timestamp)
  return parts ? `${parts.DD}.${parts.MM}.${parts.YYYY}` : ''
}

/** `DD/MM/YYYY` — category showcase and the IEC Life block. */
export function formatDateSlash(timestamp?: string | null): string {
  const parts = getDatePartsInSiteZone(timestamp)
  return parts ? `${parts.DD}/${parts.MM}/${parts.YYYY}` : ''
}

/**
 * `MM/DD/YYYY` — the post hero.
 *
 * Month-first is inconsistent with every other date on the site, but changing
 * what a page displays is not this fix's job; only the timezone behaviour
 * changes here.
 */
export function formatDateTime(timestamp?: string | null): string {
  const parts = getDatePartsInSiteZone(timestamp)
  return parts ? `${parts.MM}/${parts.DD}/${parts.YYYY}` : ''
}
