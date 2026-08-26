import { getEmailSiteUrl } from './getEmailSiteUrl'

export function getUnsubscribeUrl(token: string, locale = 'vi'): string {
  return `${getEmailSiteUrl()}/${locale}/unsubscribe?token=${token}`
}
