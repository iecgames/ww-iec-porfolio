/**
 * OAuth 2.1 authorization endpoint.
 *
 *   GET  /api/oauth/authorize  → validate, then login form or consent page
 *   POST /api/oauth/authorize  → action=login (authenticate) | action=consent
 *
 * The resource owner is a Payload user; login reuses payload.login. On consent
 * approval a one-time authorization code (10m TTL) is persisted and the browser
 * is redirected back to the client with code + state.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { CODE_TTL, ISSUER, MCP_RESOURCE } from '@/oauth/config'
import {
  htmlErrorPage,
  readParams,
  redirectTo,
  renderConsentPage,
  renderLoginPage,
  validateAuthRequest,
  type AuthRequest,
} from '@/oauth/authorize'
import { createAuthCode, randomToken } from '@/oauth/tokens'

function buildSessionCookie(token: string, exp?: number): string {
  const secure = ISSUER.startsWith('https://') ? '; Secure' : ''
  const maxAge =
    typeof exp === 'number' ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 7200
  return `payload-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

async function currentUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  headers: Headers,
): Promise<{ id: string | number; email?: string } | null> {
  try {
    const { user } = await payload.auth({ headers })
    return (user as { id: string | number; email?: string } | null) ?? null
  } catch {
    return null
  }
}

async function issueCode(
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: AuthRequest,
  userId: string,
): Promise<Response> {
  const code = randomToken()
  await createAuthCode(payload, {
    code,
    client_id: req.client_id,
    user: userId,
    redirect_uri: req.redirect_uri,
    code_challenge: req.code_challenge,
    code_challenge_method: 'S256',
    scope: req.scope,
    resource: MCP_RESOURCE,
    expiresAt: new Date(Date.now() + CODE_TTL * 1000),
  })
  return redirectTo(req.redirect_uri, { code, state: req.state })
}

export async function GET(request: Request): Promise<Response> {
  const req = readParams(new URL(request.url).searchParams)
  const payload = await getPayload({ config })

  const v = await validateAuthRequest(payload, req)
  if (v.kind === 'hard') return htmlErrorPage(v.error, v.description)
  if (v.kind === 'redirect') {
    return redirectTo(req.redirect_uri, {
      error: v.error,
      error_description: v.description,
      state: req.state,
    })
  }

  const user = await currentUser(payload, request.headers)
  if (!user) return renderLoginPage(req)
  return renderConsentPage(req, v.client, user.email ?? String(user.id))
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData()
  const action = form.get('action')
  const req = readParams(form)
  const payload = await getPayload({ config })

  const v = await validateAuthRequest(payload, req)
  if (v.kind === 'hard') return htmlErrorPage(v.error, v.description)
  if (v.kind === 'redirect') {
    return redirectTo(req.redirect_uri, {
      error: v.error,
      error_description: v.description,
      state: req.state,
    })
  }

  if (action === 'login') {
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    try {
      const result = await payload.login({ collection: 'users', data: { email, password } })
      const cookie = result.token ? buildSessionCookie(result.token, result.exp) : undefined
      const label = (result.user as { email?: string })?.email ?? email
      return renderConsentPage(req, v.client, label, cookie)
    } catch {
      return renderLoginPage(req, 'Email hoặc mật khẩu không đúng.')
    }
  }

  if (action === 'consent') {
    const user = await currentUser(payload, request.headers)
    if (!user) return renderLoginPage(req, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    if (form.get('decision') !== 'allow') {
      return redirectTo(req.redirect_uri, { error: 'access_denied', state: req.state })
    }
    return issueCode(payload, req, String(user.id))
  }

  return htmlErrorPage('invalid_request', 'Unknown action')
}
