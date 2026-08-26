import { getServerSideURL } from '@/utilities/getURL'

/**
 * Absolute base URL for links inside outgoing email.
 *
 * Email clients have no origin to resolve relative paths against, so every link
 * — post, job, and above all unsubscribe — has to be absolute and correct.
 *
 * `SITE_URL` stays supported as an override, but it is not defined anywhere in
 * this project (not in .env, .env.example or docker-compose.yml), so the real
 * value comes from getServerSideURL() like everywhere else in the app.
 */
export function getEmailSiteUrl(): string {
  return (process.env.SITE_URL || getServerSideURL()).replace(/\/$/, '')
}
