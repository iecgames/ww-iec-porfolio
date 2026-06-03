/**
 * OAuth 2.1 token endpoint.
 *
 * POST /api/oauth/token
 *   grant_type=authorization_code → verify PKCE (S256), one-time code,
 *     redirect_uri + resource binding → mint access JWT + refresh token.
 *   grant_type=refresh_token → rotate refresh token, mint new access JWT.
 */
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { loadClient, type ClientDoc } from '@/oauth/authorize'
import { ACCESS_TOKEN_TTL, MCP_RESOURCE, REFRESH_TOKEN_TTL, SUPPORTED_SCOPE } from '@/oauth/config'
import { corsPreflight, jsonResponse, oauthError } from '@/oauth/http'
import { signAccessToken } from '@/oauth/jwt'
import { verifyPkceS256 } from '@/oauth/pkce'
import {
  createRefreshToken,
  findAuthCode,
  findRefreshTokenByHash,
  hashToken,
  markAuthCodeUsed,
  randomToken,
  revokeRefreshByUserClient,
  revokeRefreshToken,
} from '@/oauth/tokens'

interface ClientWithSecret extends ClientDoc {
  client_secret?: string | null
  token_endpoint_auth_method?: string | null
}

function tokenResponse(accessToken: string, refreshToken: string, scope: string): Response {
  return jsonResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
    refresh_token: refreshToken,
    scope,
  })
}

/** Confidential clients must present their secret; public (PKCE) clients need not. */
function clientAuthError(client: ClientWithSecret, form: FormData): Response | null {
  if (client.token_endpoint_auth_method === 'client_secret_post') {
    const secret = String(form.get('client_secret') ?? '')
    if (!secret || secret !== client.client_secret) {
      return oauthError('invalid_client', 'Invalid client credentials', 401)
    }
  }
  return null
}

async function handleAuthorizationCode(payload: Payload, form: FormData): Promise<Response> {
  const code = String(form.get('code') ?? '')
  const verifier = String(form.get('code_verifier') ?? '')
  const redirectUri = String(form.get('redirect_uri') ?? '')
  const clientId = String(form.get('client_id') ?? '')
  const resource = String(form.get('resource') ?? '')

  if (!code || !verifier || !redirectUri || !clientId) {
    return oauthError('invalid_request', 'Missing required parameters')
  }

  const client = (await loadClient(payload, clientId)) as ClientWithSecret | null
  if (!client) return oauthError('invalid_client', 'Unknown client_id', 401)
  const authErr = clientAuthError(client, form)
  if (authErr) return authErr

  const doc = await findAuthCode(payload, code)
  if (!doc) return oauthError('invalid_grant', 'Authorization code not found')

  // Reuse detection: a used code being replayed is a theft signal — revoke the
  // refresh tokens issued to this user+client.
  if (doc.used) {
    await revokeRefreshByUserClient(payload, String(doc.user), clientId)
    return oauthError('invalid_grant', 'Authorization code already used')
  }
  if (new Date(doc.expires_at as string) < new Date()) {
    return oauthError('invalid_grant', 'Authorization code expired')
  }
  if (doc.client_id !== clientId) return oauthError('invalid_grant', 'client_id mismatch')
  if (doc.redirect_uri !== redirectUri) return oauthError('invalid_grant', 'redirect_uri mismatch')
  if (!(await verifyPkceS256(verifier, doc.code_challenge as string))) {
    return oauthError('invalid_grant', 'PKCE verification failed')
  }
  if (resource && doc.resource && resource !== doc.resource) {
    return oauthError('invalid_target', 'resource mismatch')
  }

  await markAuthCodeUsed(payload, doc.id)

  const sub = String(doc.user)
  const scope = (doc.scope as string) || SUPPORTED_SCOPE
  const accessToken = await signAccessToken({ sub, client_id: clientId, scope })
  const refreshToken = randomToken()
  await createRefreshToken(payload, {
    token_hash: await hashToken(refreshToken),
    client_id: clientId,
    user: sub,
    scope,
    resource: (doc.resource as string) || MCP_RESOURCE,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
  })

  return tokenResponse(accessToken, refreshToken, scope)
}

async function handleRefreshToken(payload: Payload, form: FormData): Promise<Response> {
  const refreshToken = String(form.get('refresh_token') ?? '')
  const clientId = String(form.get('client_id') ?? '')
  if (!refreshToken) return oauthError('invalid_request', 'refresh_token required')

  const doc = await findRefreshTokenByHash(payload, await hashToken(refreshToken))
  if (!doc || doc.revoked) return oauthError('invalid_grant', 'Invalid refresh token')
  if (new Date(doc.expires_at as string) < new Date()) {
    return oauthError('invalid_grant', 'Refresh token expired')
  }
  if (clientId && doc.client_id !== clientId) {
    return oauthError('invalid_grant', 'client_id mismatch')
  }

  const client = (await loadClient(payload, doc.client_id as string)) as ClientWithSecret | null
  if (client) {
    const authErr = clientAuthError(client, form)
    if (authErr) return authErr
  }

  // Rotate: revoke the presented token, issue a fresh one.
  await revokeRefreshToken(payload, doc.id)

  const sub = String(doc.user)
  const scope = (doc.scope as string) || SUPPORTED_SCOPE
  const newRefresh = randomToken()
  await createRefreshToken(payload, {
    token_hash: await hashToken(newRefresh),
    client_id: doc.client_id as string,
    user: sub,
    scope,
    resource: (doc.resource as string) || MCP_RESOURCE,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
  })
  const accessToken = await signAccessToken({ sub, client_id: doc.client_id as string, scope })

  return tokenResponse(accessToken, newRefresh, scope)
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return oauthError('invalid_request', 'Body must be application/x-www-form-urlencoded')
  }

  const grantType = String(form.get('grant_type') ?? '')
  const payload = await getPayload({ config })

  if (grantType === 'authorization_code') return handleAuthorizationCode(payload, form)
  if (grantType === 'refresh_token') return handleRefreshToken(payload, form)
  return oauthError('unsupported_grant_type', `Unsupported grant_type: ${grantType}`)
}

export function OPTIONS(): Response {
  return corsPreflight()
}
