/**
 * @vitest-environment node
 *
 * Phase 04 acceptance — DCR (/api/oauth/register) and the token endpoint
 * (/api/oauth/token): authorization_code + PKCE, one-time reuse, redirect_uri
 * and resource binding, and refresh-token rotation.
 *
 * Codes are seeded directly via the local API (the browser consent flow is
 * covered separately in oauth-authorize.int.spec.ts). Requires a running dev
 * server (default http://localhost:3000).
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { verifyAccessToken } from '@/oauth/jwt'
import { sha256base64url } from '@/oauth/pkce'

const BASE = process.env.OAUTH_TEST_URL || 'http://localhost:3000'
const REDIRECT = `${BASE}/cb`
const RESOURCE = `${BASE}/api/mcp`
const EMAIL = 'mcp-oauth-token-test@example.com'
const VERIFIER = 'token-pkce-verifier-9876543210-zyxwvutsrqponmlkjihgfedcba'

let payload: Payload
let challenge: string
let userId: string
let clientId: string

async function tokenRequest(fields: Record<string, string>): Promise<Response> {
  return fetch(`${BASE}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  })
}

let codeCounter = 0
async function seedCode(overrides: Record<string, unknown> = {}): Promise<string> {
  const code = `test-code-${codeCounter++}-${Math.floor(Math.random() * 1e9)}`
  await payload.create({
    collection: 'oauth-codes',
    overrideAccess: true,
    data: {
      code,
      client_id: clientId,
      user: userId,
      redirect_uri: REDIRECT,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'mcp',
      resource: RESOURCE,
      expires_at: new Date(Date.now() + 600_000).toISOString(),
      used: false,
      ...overrides,
    },
  })
  return code
}

beforeAll(async () => {
  challenge = await sha256base64url(VERIFIER)
  payload = await getPayload({ config })

  await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true }).catch(() => {})
  const user = await payload.create({
    collection: 'users',
    data: { email: EMAIL, password: 'Tok1234!pkce', name: 'Token Test' },
    overrideAccess: true,
  })
  userId = String(user.id)
})

afterAll(async () => {
  await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true }).catch(() => {})
  if (clientId) {
    await payload.delete({ collection: 'oauth-clients', where: { client_id: { equals: clientId } }, overrideAccess: true }).catch(() => {})
    await payload.delete({ collection: 'oauth-codes', where: { client_id: { equals: clientId } }, overrideAccess: true }).catch(() => {})
    await payload.delete({ collection: 'oauth-refresh-tokens', where: { client_id: { equals: clientId } }, overrideAccess: true }).catch(() => {})
  }
})

describe('POST /api/oauth/register (DCR)', () => {
  it('registers a client and returns a client_id', async () => {
    const res = await fetch(`${BASE}/api/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'DCR Test', redirect_uris: [REDIRECT] }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client_id).toMatch(/^mcp_/)
    expect(body.token_endpoint_auth_method).toBe('none')
    clientId = body.client_id

    const found = await payload.find({
      collection: 'oauth-clients',
      where: { client_id: { equals: clientId } },
      overrideAccess: true,
    })
    expect(found.docs).toHaveLength(1)
  })

  it('rejects registration without valid redirect_uris', async () => {
    const res = await fetch(`${BASE}/api/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Bad', redirect_uris: ['not-a-url'] }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_redirect_uri')
  })
})

describe('POST /api/oauth/token — authorization_code', () => {
  it('exchanges a code for an access token + refresh token', async () => {
    const code = await seedCode()
    const res = await tokenRequest({
      grant_type: 'authorization_code',
      code,
      code_verifier: VERIFIER,
      redirect_uri: REDIRECT,
      client_id: clientId,
      resource: RESOURCE,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token_type).toBe('Bearer')
    expect(body.expires_in).toBe(3600)
    expect(body.refresh_token).toBeTruthy()

    const claims = await verifyAccessToken(body.access_token)
    expect(claims.sub).toBe(userId)
    expect(claims.aud).toBe(RESOURCE)
    expect(claims.client_id).toBe(clientId)
  })

  it('rejects code reuse with invalid_grant', async () => {
    const code = await seedCode()
    const ok = await tokenRequest({
      grant_type: 'authorization_code', code, code_verifier: VERIFIER, redirect_uri: REDIRECT, client_id: clientId,
    })
    expect(ok.status).toBe(200)
    const reuse = await tokenRequest({
      grant_type: 'authorization_code', code, code_verifier: VERIFIER, redirect_uri: REDIRECT, client_id: clientId,
    })
    expect(reuse.status).toBe(400)
    expect((await reuse.json()).error).toBe('invalid_grant')
  })

  it('rejects a wrong PKCE verifier', async () => {
    const code = await seedCode()
    const res = await tokenRequest({
      grant_type: 'authorization_code', code, code_verifier: 'wrong-verifier', redirect_uri: REDIRECT, client_id: clientId,
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_grant')
  })

  it('rejects a mismatched redirect_uri', async () => {
    const code = await seedCode()
    const res = await tokenRequest({
      grant_type: 'authorization_code', code, code_verifier: VERIFIER, redirect_uri: `${BASE}/other`, client_id: clientId,
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_grant')
  })

  it('rejects a mismatched resource with invalid_target', async () => {
    const code = await seedCode()
    const res = await tokenRequest({
      grant_type: 'authorization_code', code, code_verifier: VERIFIER, redirect_uri: REDIRECT, client_id: clientId,
      resource: 'https://evil.example/api/mcp',
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_target')
  })
})

describe('POST /api/oauth/token — refresh_token rotation', () => {
  it('rotates the refresh token and rejects the old one', async () => {
    const code = await seedCode()
    const first = await tokenRequest({
      grant_type: 'authorization_code', code, code_verifier: VERIFIER, redirect_uri: REDIRECT, client_id: clientId,
    })
    const { refresh_token: refresh1 } = await first.json()

    const refreshed = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refresh1, client_id: clientId })
    expect(refreshed.status).toBe(200)
    const body = await refreshed.json()
    expect(body.access_token).toBeTruthy()
    expect(body.refresh_token).toBeTruthy()
    expect(body.refresh_token).not.toBe(refresh1)

    const reused = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refresh1, client_id: clientId })
    expect(reused.status).toBe(400)
    expect((await reused.json()).error).toBe('invalid_grant')
  })
})
