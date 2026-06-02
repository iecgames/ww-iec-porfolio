/**
 * Token/code generation and persistence helpers for the OAuth server.
 *
 * Authorization codes and refresh tokens live in MongoDB (the app runs on
 * serverless infra, so in-memory state is not shared across instances).
 * Refresh tokens are stored as a SHA-256 hash, never raw.
 */
import type { Payload } from 'payload'

export function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('base64url')
}

export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Buffer.from(buf).toString('hex')
}

// ─── Authorization codes ──────────────────────────────────────────────────────

export interface AuthCodeData {
  code: string
  client_id: string
  user: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: string
  scope: string
  resource?: string
  expiresAt: Date
}

export async function createAuthCode(payload: Payload, data: AuthCodeData): Promise<void> {
  await payload.create({
    collection: 'oauth-codes',
    overrideAccess: true,
    data: {
      code: data.code,
      client_id: data.client_id,
      user: data.user,
      redirect_uri: data.redirect_uri,
      code_challenge: data.code_challenge,
      code_challenge_method: data.code_challenge_method,
      scope: data.scope,
      resource: data.resource,
      expires_at: data.expiresAt.toISOString(),
      used: false,
    },
  })
}

export async function findAuthCode(payload: Payload, code: string) {
  const res = await payload.find({
    collection: 'oauth-codes',
    where: { code: { equals: code } },
    limit: 1,
    depth: 0, // keep `user` as the raw id, not a populated doc
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

export async function markAuthCodeUsed(payload: Payload, id: string | number): Promise<void> {
  await payload.update({ collection: 'oauth-codes', id, data: { used: true }, overrideAccess: true })
}

// ─── Refresh tokens ───────────────────────────────────────────────────────────

export interface RefreshTokenData {
  token_hash: string
  client_id: string
  user: string
  scope: string
  resource?: string
  expiresAt: Date
}

export async function createRefreshToken(payload: Payload, data: RefreshTokenData): Promise<void> {
  await payload.create({
    collection: 'oauth-refresh-tokens',
    overrideAccess: true,
    data: {
      token_hash: data.token_hash,
      client_id: data.client_id,
      user: data.user,
      scope: data.scope,
      resource: data.resource,
      expires_at: data.expiresAt.toISOString(),
      revoked: false,
    },
  })
}

export async function findRefreshTokenByHash(payload: Payload, tokenHash: string) {
  const res = await payload.find({
    collection: 'oauth-refresh-tokens',
    where: { token_hash: { equals: tokenHash } },
    limit: 1,
    depth: 0, // keep `user` as the raw id, not a populated doc
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

export async function revokeRefreshToken(payload: Payload, id: string | number): Promise<void> {
  await payload.update({
    collection: 'oauth-refresh-tokens',
    id,
    data: { revoked: true },
    overrideAccess: true,
  })
}

/** Revoke every (non-revoked) refresh token for a user+client pair. */
export async function revokeRefreshByUserClient(
  payload: Payload,
  userId: string | number,
  clientId: string,
): Promise<void> {
  await payload.update({
    collection: 'oauth-refresh-tokens',
    where: {
      and: [
        { user: { equals: userId } },
        { client_id: { equals: clientId } },
        { revoked: { equals: false } },
      ],
    },
    data: { revoked: true },
    overrideAccess: true,
  })
}
