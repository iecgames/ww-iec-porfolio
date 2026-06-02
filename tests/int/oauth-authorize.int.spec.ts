/**
 * @vitest-environment node
 *
 * Phase 03 acceptance — /api/oauth/authorize login + consent + code issuance.
 *
 * Seeds a client + user via the Payload local API, then drives the HTTP flow
 * against a running dev server (default http://localhost:3000). Set
 * OAUTH_TEST_URL to point elsewhere. Requires the dev server to be running.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { sha256base64url } from '@/oauth/pkce'

const BASE = process.env.OAUTH_TEST_URL || 'http://localhost:3000'
const REDIRECT = `${BASE}/cb`
const EMAIL = 'mcp-oauth-test@example.com'
const PASSWORD = 'Test1234!pkce'
const CLIENT_ID = 'mcp_test_authorize'
const VERIFIER = 'pkce-verifier-0123456789-abcdefghijklmnopqrstuvwxyz'

let payload: Payload
let challenge: string

function authUrl(overrides: Record<string, string> = {}): string {
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'mcp',
    state: 'xyz',
    resource: `${BASE}/api/mcp`,
    ...overrides,
  })
  return `${BASE}/api/oauth/authorize?${p.toString()}`
}

function form(fields: Record<string, string>): URLSearchParams {
  return new URLSearchParams(fields)
}

const baseFields = () => ({
  response_type: 'code',
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT,
  code_challenge: challenge,
  code_challenge_method: 'S256',
  scope: 'mcp',
  state: 'xyz',
  resource: `${BASE}/api/mcp`,
})

beforeAll(async () => {
  challenge = await sha256base64url(VERIFIER)
  payload = await getPayload({ config })

  // Clean any leftovers from a previous run.
  await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'oauth-clients', where: { client_id: { equals: CLIENT_ID } }, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'oauth-codes', where: { client_id: { equals: CLIENT_ID } }, overrideAccess: true }).catch(() => {})

  await payload.create({
    collection: 'users',
    data: { email: EMAIL, password: PASSWORD, name: 'MCP OAuth Test' },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'oauth-clients',
    data: {
      client_id: CLIENT_ID,
      client_name: 'Authorize Test Client',
      redirect_uris: [{ uri: REDIRECT }],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      scope: 'mcp',
    },
    overrideAccess: true,
  })
})

afterAll(async () => {
  await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'oauth-clients', where: { client_id: { equals: CLIENT_ID } }, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'oauth-codes', where: { client_id: { equals: CLIENT_ID } }, overrideAccess: true }).catch(() => {})
})

describe('GET /api/oauth/authorize — validation', () => {
  it('renders the login form when unauthenticated', async () => {
    const res = await fetch(authUrl())
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Đăng nhập')
    expect(html).toContain('name="action" value="login"')
  })

  it('returns a hard error page for an unknown client_id', async () => {
    const res = await fetch(authUrl({ client_id: 'nope' }), { redirect: 'manual' })
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('invalid_client')
  })

  it('redirects invalid_request when code_challenge is missing', async () => {
    const res = await fetch(authUrl({ code_challenge: '' }), { redirect: 'manual' })
    expect(res.status).toBe(302)
    const loc = new URL(res.headers.get('location') as string)
    expect(loc.searchParams.get('error')).toBe('invalid_request')
    expect(loc.searchParams.get('state')).toBe('xyz')
  })

  it('redirects invalid_target when resource mismatches', async () => {
    const res = await fetch(authUrl({ resource: 'https://evil.example/api/mcp' }), { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(new URL(res.headers.get('location') as string).searchParams.get('error')).toBe('invalid_target')
  })
})

describe('POST /api/oauth/authorize — login + consent', () => {
  let cookie = ''

  it('rejects wrong credentials', async () => {
    const res = await fetch(`${BASE}/api/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ ...baseFields(), action: 'login', email: EMAIL, password: 'wrong' }),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('không đúng')
  })

  it('logs in and shows the consent page with a session cookie', async () => {
    const res = await fetch(`${BASE}/api/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ ...baseFields(), action: 'login', email: EMAIL, password: PASSWORD }),
    })
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).toContain('payload-token=')
    cookie = setCookie.split(';')[0]
    expect(await res.text()).toContain('Cho phép')
  })

  it('issues a code on approval', async () => {
    const res = await fetch(`${BASE}/api/oauth/authorize`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: form({ ...baseFields(), action: 'consent', decision: 'allow' }),
    })
    expect(res.status).toBe(302)
    const loc = new URL(res.headers.get('location') as string)
    expect(loc.origin + loc.pathname).toBe(REDIRECT)
    expect(loc.searchParams.get('state')).toBe('xyz')
    const code = loc.searchParams.get('code')
    expect(code).toBeTruthy()

    const found = await payload.find({
      collection: 'oauth-codes',
      where: { code: { equals: code as string } },
      overrideAccess: true,
    })
    expect(found.docs).toHaveLength(1)
    expect(found.docs[0].used).toBe(false)
    expect(found.docs[0].code_challenge).toBe(challenge)
  })

  it('redirects access_denied on deny', async () => {
    const res = await fetch(`${BASE}/api/oauth/authorize`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: form({ ...baseFields(), action: 'consent', decision: 'deny' }),
    })
    expect(res.status).toBe(302)
    expect(new URL(res.headers.get('location') as string).searchParams.get('error')).toBe('access_denied')
  })
})
