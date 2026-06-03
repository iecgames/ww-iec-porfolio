import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Match all paths except:
  // - /api/** (Payload API)
  // - /admin/** (Payload Admin)
  // - /next/** (preview / exit-preview routes — locale-agnostic)
  // - /_next/** (Next.js internals)
  // - /_vercel/** (Vercel internals)
  // - Files with an extension (static assets)
  matcher: ['/((?!api|admin|next|_next|_vercel|.*\\..*).*)'],
}
