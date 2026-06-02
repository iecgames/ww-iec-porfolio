/**
 * Helpers for the /api/oauth/authorize endpoint: request parsing/validation,
 * redirect building, and the minimal login + consent HTML pages.
 */
import type { Payload } from 'payload'

import { MCP_RESOURCE, SUPPORTED_SCOPE } from './config'

export interface AuthRequest {
  response_type: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: string
  scope: string
  state: string
  resource: string
}

export const AUTH_FIELDS: (keyof AuthRequest)[] = [
  'response_type',
  'client_id',
  'redirect_uri',
  'code_challenge',
  'code_challenge_method',
  'scope',
  'state',
  'resource',
]

export interface ClientDoc {
  client_id: string
  client_name?: string | null
  redirect_uris?: { uri: string }[] | null
}

export function readParams(src: URLSearchParams | FormData): AuthRequest {
  const get = (k: string): string => {
    const v = src.get(k)
    return typeof v === 'string' ? v : ''
  }
  return {
    response_type: get('response_type'),
    client_id: get('client_id'),
    redirect_uri: get('redirect_uri'),
    code_challenge: get('code_challenge'),
    code_challenge_method: get('code_challenge_method') || 'S256',
    scope: get('scope') || SUPPORTED_SCOPE,
    state: get('state'),
    resource: get('resource'),
  }
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

export async function loadClient(
  payload: Payload,
  clientId: string,
): Promise<ClientDoc | null> {
  if (!clientId) return null
  const res = await payload.find({
    collection: 'oauth-clients',
    where: { client_id: { equals: clientId } },
    limit: 1,
    overrideAccess: true,
  })
  return (res.docs[0] as ClientDoc | undefined) ?? null
}

export type ValidationResult =
  | { kind: 'hard'; error: string; description: string }
  | { kind: 'redirect'; error: string; description: string }
  | { kind: 'ok'; client: ClientDoc }

/**
 * Validates an authorization request. client_id / redirect_uri failures are
 * "hard" (render an error page — never redirect to an unverified URI). Once the
 * redirect_uri is trusted, remaining failures are reported back via redirect.
 */
export async function validateAuthRequest(
  payload: Payload,
  req: AuthRequest,
): Promise<ValidationResult> {
  const client = await loadClient(payload, req.client_id)
  if (!client) return { kind: 'hard', error: 'invalid_client', description: 'Unknown client_id' }

  const uris = (client.redirect_uris ?? []).map((u) => u.uri)
  if (!req.redirect_uri || !uris.includes(req.redirect_uri)) {
    return { kind: 'hard', error: 'invalid_request', description: 'redirect_uri mismatch' }
  }

  if (req.response_type !== 'code') {
    return { kind: 'redirect', error: 'unsupported_response_type', description: 'response_type must be code' }
  }
  if (!req.code_challenge) {
    return { kind: 'redirect', error: 'invalid_request', description: 'code_challenge required (PKCE)' }
  }
  if (req.code_challenge_method !== 'S256') {
    return { kind: 'redirect', error: 'invalid_request', description: 'code_challenge_method must be S256' }
  }
  if (req.scope && req.scope !== SUPPORTED_SCOPE) {
    return { kind: 'redirect', error: 'invalid_scope', description: `only "${SUPPORTED_SCOPE}" is supported` }
  }
  if (req.resource && req.resource !== MCP_RESOURCE) {
    return { kind: 'redirect', error: 'invalid_target', description: 'resource does not match this MCP server' }
  }
  return { kind: 'ok', client }
}

/** Build a 302 redirect to redirect_uri with the given query params appended. */
export function redirectTo(redirectUri: string, params: Record<string, string>): Response {
  const url = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v)
  }
  return new Response(null, { status: 302, headers: { Location: url.toString() } })
}

// ─── HTML pages ───────────────────────────────────────────────────────────────

function page(title: string, body: string): Response {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root{color-scheme:light dark}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:8vh auto;padding:0 20px;line-height:1.5}
  h1{font-size:1.25rem} .muted{opacity:.7;font-size:.9rem}
  form{display:flex;flex-direction:column;gap:12px;margin-top:20px}
  label{display:flex;flex-direction:column;gap:4px;font-size:.9rem}
  input{padding:10px;border:1px solid #8884;border-radius:8px;font-size:1rem;background:transparent;color:inherit}
  .row{display:flex;gap:10px}
  button{padding:10px 16px;border:0;border-radius:8px;font-size:1rem;cursor:pointer;flex:1}
  .primary{background:#2563eb;color:#fff} .ghost{background:#8882;color:inherit}
  .err{color:#dc2626;font-size:.9rem;margin-top:8px}
  .card{border:1px solid #8883;border-radius:12px;padding:16px;margin-top:16px}
</style></head><body>${body}</body></html>`
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function hiddenFields(req: AuthRequest): string {
  return AUTH_FIELDS.map(
    (f) => `<input type="hidden" name="${f}" value="${escapeHtml(req[f])}">`,
  ).join('')
}

export function renderLoginPage(req: AuthRequest, error?: string): Response {
  return page(
    'Đăng nhập — MCP',
    `<h1>Đăng nhập để kết nối MCP</h1>
<p class="muted">Một ứng dụng đang yêu cầu truy cập MCP của bạn. Đăng nhập bằng tài khoản quản trị để tiếp tục.</p>
<form method="post" action="/api/oauth/authorize">
  ${hiddenFields(req)}
  <input type="hidden" name="action" value="login">
  <label>Email<input type="email" name="email" required autocomplete="username"></label>
  <label>Mật khẩu<input type="password" name="password" required autocomplete="current-password"></label>
  ${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
  <button class="primary" type="submit">Đăng nhập</button>
</form>`,
  )
}

export function renderConsentPage(
  req: AuthRequest,
  client: ClientDoc,
  userLabel: string,
  setCookie?: string,
): Response {
  const name = client.client_name || client.client_id
  const res = page(
    'Cấp quyền — MCP',
    `<h1>Cấp quyền truy cập</h1>
<p class="muted">Đăng nhập với <strong>${escapeHtml(userLabel)}</strong>.</p>
<div class="card">
  <strong>${escapeHtml(name)}</strong> muốn truy cập MCP server của bạn.
  <div class="muted" style="margin-top:6px">Phạm vi: <code>${escapeHtml(req.scope)}</code></div>
</div>
<form method="post" action="/api/oauth/authorize">
  ${hiddenFields(req)}
  <input type="hidden" name="action" value="consent">
  <div class="row">
    <button class="ghost" type="submit" name="decision" value="deny">Từ chối</button>
    <button class="primary" type="submit" name="decision" value="allow">Cho phép</button>
  </div>
</form>`,
  )
  if (setCookie) res.headers.append('Set-Cookie', setCookie)
  return res
}

export function htmlErrorPage(error: string, description: string): Response {
  const res = page(
    'Lỗi — MCP',
    `<h1>Không thể tiếp tục</h1>
<div class="card"><strong>${escapeHtml(error)}</strong><div class="muted" style="margin-top:6px">${escapeHtml(description)}</div></div>`,
  )
  return new Response(res.body, { status: 400, headers: res.headers })
}
