/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414).
 *
 * Real path: GET /.well-known/oauth-authorization-server
 * (rewritten in next.config.ts).
 */
import { ISSUER, OAUTH, SUPPORTED_SCOPE } from '@/oauth/config'
import { corsPreflight, jsonResponse } from '@/oauth/http'

export function GET(): Response {
  return jsonResponse(
    {
      issuer: ISSUER,
      authorization_endpoint: OAUTH.authorization_endpoint,
      token_endpoint: OAUTH.token_endpoint,
      registration_endpoint: OAUTH.registration_endpoint,
      jwks_uri: OAUTH.jwks_uri,
      scopes_supported: [SUPPORTED_SCOPE],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    },
    { cache: 'public, max-age=3600' },
  )
}

export function OPTIONS(): Response {
  return corsPreflight()
}
