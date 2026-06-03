/**
 * Central config for the embedded MCP OAuth 2.1 authorization server.
 * Every URL / constant the OAuth endpoints rely on derives from here.
 */
import { getServerSideURL } from '@/utilities/getURL'

// Public base URL of this deployment (issuer). Falls back to the app's
// computed server URL when OAUTH_ISSUER is not set.
export const ISSUER = (process.env.OAUTH_ISSUER || getServerSideURL()).replace(/\/$/, '')

// The protected resource identifier — the MCP endpoint. Access tokens are
// bound to this audience (RFC 8707 resource indicator).
export const MCP_RESOURCE = `${ISSUER}/api/mcp`

export const SUPPORTED_SCOPE = 'mcp'

export const ACCESS_TOKEN_TTL = Number(process.env.OAUTH_ACCESS_TOKEN_TTL ?? 3600) // seconds
export const REFRESH_TOKEN_TTL = Number(process.env.OAUTH_REFRESH_TOKEN_TTL ?? 2592000) // 30d
export const CODE_TTL = 600 // authorization code lifetime — 10 minutes

export const PRM_URL = `${ISSUER}/.well-known/oauth-protected-resource`

export const OAUTH = {
  authorization_endpoint: `${ISSUER}/api/oauth/authorize`,
  token_endpoint: `${ISSUER}/api/oauth/token`,
  registration_endpoint: `${ISSUER}/api/oauth/register`,
  jwks_uri: `${ISSUER}/api/oauth/jwks`,
}
