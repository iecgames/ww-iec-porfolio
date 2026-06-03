/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * Real path: GET /.well-known/oauth-protected-resource
 * (served here and rewritten in next.config.ts, since Next ignores
 * dot-prefixed directories).
 */
import { ISSUER, MCP_RESOURCE, SUPPORTED_SCOPE } from '@/oauth/config'
import { corsPreflight, jsonResponse } from '@/oauth/http'

export function GET(): Response {
  return jsonResponse(
    {
      resource: MCP_RESOURCE,
      authorization_servers: [ISSUER],
      scopes_supported: [SUPPORTED_SCOPE],
      bearer_methods_supported: ['header'],
    },
    { cache: 'public, max-age=3600' },
  )
}

export function OPTIONS(): Response {
  return corsPreflight()
}
