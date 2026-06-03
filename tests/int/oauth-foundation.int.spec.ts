/**
 * @vitest-environment node
 *
 * Unit tests for the OAuth crypto foundation (Phase 01).
 *
 * Pure crypto — no Payload/Mongo needed. Generates an ephemeral ES256 (EC P-256)
 * private key, injects it via env, then exercises JWT sign/verify and PKCE S256.
 * The public key is derived from the private key at runtime (no public env var).
 *
 * Runs in the `node` environment (not the project-default jsdom) because jose's
 * WebCrypto path requires a single Uint8Array realm — which matches the real
 * Next.js server runtime anyway.
 */
import { generateKeyPairSync } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'

// Inject key material BEFORE importing the oauth modules (keys are read lazily,
// but set here so any eager read also sees them).
beforeAll(() => {
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  process.env.OAUTH_JWT_PRIVATE_KEY = Buffer.from(privateKey).toString('base64')
  process.env.OAUTH_ISSUER = 'http://localhost:3000'
})

describe('OAuth JWT (ES256)', () => {
  it('signs and verifies an access token with correct claims', async () => {
    const { signAccessToken, verifyAccessToken } = await import('@/oauth/jwt')
    const token = await signAccessToken({ sub: 'user-123', client_id: 'mcp_abc' })
    const claims = await verifyAccessToken(token)
    expect(claims.sub).toBe('user-123')
    expect(claims.client_id).toBe('mcp_abc')
    expect(claims.scope).toBe('mcp')
    expect(claims.aud).toBe('http://localhost:3000/api/mcp')
    expect(claims.iss).toBe('http://localhost:3000')
  })

  it('rejects a tampered token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('@/oauth/jwt')
    const token = await signAccessToken({ sub: 'user-123', client_id: 'mcp_abc' })
    const tampered = token.slice(0, -3) + (token.slice(-3) === 'aaa' ? 'bbb' : 'aaa')
    await expect(verifyAccessToken(tampered)).rejects.toThrow()
  })
})

describe('PKCE (S256)', () => {
  it('verifies a matching code_verifier / challenge pair', async () => {
    const { sha256base64url, verifyPkceS256 } = await import('@/oauth/pkce')
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = await sha256base64url(verifier)
    expect(await verifyPkceS256(verifier, challenge)).toBe(true)
    expect(await verifyPkceS256('wrong-verifier', challenge)).toBe(false)
  })
})

describe('token helpers', () => {
  it('generates URL-safe random tokens and stable hashes', async () => {
    const { randomToken, hashToken } = await import('@/oauth/tokens')
    const t = randomToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/)
    const h1 = await hashToken(t)
    const h2 = await hashToken(t)
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashToken(randomToken())).not.toBe(h1)
  })
})
