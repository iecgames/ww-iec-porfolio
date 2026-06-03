/**
 * Dynamic Client Registration (RFC 7591).
 *
 * POST /api/oauth/register — a client (ChatGPT/Claude/Cursor) self-registers
 * and receives a generated client_id. Public clients (PKCE) get no secret.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { corsPreflight, jsonResponse, oauthError } from '@/oauth/http'
import { randomToken } from '@/oauth/tokens'

function isValidRedirectUri(value: unknown): value is string {
  if (typeof value !== 'string') return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol === 'https:') return true
  // Allow http only for loopback (local development / native clients).
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return oauthError('invalid_request', 'Body must be JSON')
  }

  const redirectUris = body.redirect_uris
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every(isValidRedirectUri)) {
    return oauthError('invalid_redirect_uri', 'redirect_uris must be a non-empty array of https (or loopback http) URLs')
  }

  const method = body.token_endpoint_auth_method === 'client_secret_post' ? 'client_secret_post' : 'none'
  const grantTypes = Array.isArray(body.grant_types)
    ? (body.grant_types as string[])
    : ['authorization_code', 'refresh_token']
  const clientName = typeof body.client_name === 'string' ? body.client_name : undefined

  const clientId = `mcp_${randomToken(12)}`
  const clientSecret = method === 'client_secret_post' ? randomToken(24) : undefined

  const payload = await getPayload({ config })
  await payload.create({
    collection: 'oauth-clients',
    overrideAccess: true,
    data: {
      client_id: clientId,
      client_secret: clientSecret,
      client_name: clientName ?? null,
      redirect_uris: (redirectUris as string[]).map((uri) => ({ uri })),
      grant_types: grantTypes,
      token_endpoint_auth_method: method,
      scope: 'mcp',
    },
  })

  return jsonResponse(
    {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      ...(clientName ? { client_name: clientName } : {}),
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      token_endpoint_auth_method: method,
      scope: 'mcp',
    },
    { status: 201 },
  )
}

export function OPTIONS(): Response {
  return corsPreflight()
}
