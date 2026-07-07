/**
 * MCP HTTP endpoint — Streamable HTTP transport (stateless per-request).
 *
 * Endpoint: POST|GET|DELETE /api/mcp
 *
 * Authentication:
 *   • Authorization: Bearer <OAuth 2.1 access JWT>  (issued by this app's AS)
 *
 * Unauthenticated requests get 401 + a WWW-Authenticate header pointing at the
 * protected-resource metadata (RFC 9728) so MCP clients (ChatGPT) start the
 * OAuth flow automatically.
 *
 * Every request creates a fresh McpServer + transport instance.
 * No session state is persisted; each AI Agent turn is self-contained.
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import config from '@payload-config'
import { getPayload } from 'payload'

import { PRM_URL, SUPPORTED_SCOPE } from '@/oauth/config'
import { verifyAccessToken } from '@/oauth/jwt'
import { createMcpServer } from '../../../../mcp/server'

// ─── CORS headers ────────────────────────────────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version, WWW-Authenticate',
}

function corsResponse(status: number, body?: BodyInit | null): Response {
  return new Response(body ?? null, { status, headers: CORS_HEADERS })
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
type AuthResult =
  | { ok: true; mode: 'oauth'; sub: string; client_id?: string }
  | { ok: false; error: 'invalid_token' | 'insufficient_scope' | 'missing_token' }

async function authenticate(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return { ok: false, error: 'missing_token' }

  // OAuth 2.1 access token (ES256 JWT) — verifies iss/aud/exp/signature.
  try {
    const claims = await verifyAccessToken(token)
    const scope = typeof claims.scope === 'string' ? claims.scope : ''
    if (scope && !scope.split(' ').includes(SUPPORTED_SCOPE)) {
      return { ok: false, error: 'insufficient_scope' }
    }
    return { ok: true, mode: 'oauth', sub: String(claims.sub), client_id: claims.client_id as string | undefined }
  } catch {
    return { ok: false, error: 'invalid_token' }
  }
}

function unauthorized(error: 'invalid_token' | 'insufficient_scope' | 'missing_token'): Response {
  const insufficient = error === 'insufficient_scope'
  const challenge =
    `Bearer resource_metadata="${PRM_URL}"` + (insufficient ? `, scope="${SUPPORTED_SCOPE}"` : '')
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32001, message: insufficient ? 'Insufficient scope' : 'Unauthorized' },
      id: null,
    }),
    {
      status: insufficient ? 403 : 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'WWW-Authenticate': challenge },
    },
  )
}

// ─── Core handler ─────────────────────────────────────────────────────────────
async function handleMcp(request: Request): Promise<Response> {
  const auth = await authenticate(request)
  if (!auth.ok) return unauthorized(auth.error)

  const payload = await getPayload({ config })
  const server = createMcpServer(payload)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — fresh instance per request
    enableJsonResponse: true, // return JSON directly; avoids SSE stream being closed by finally block
  })

  await server.connect(transport)

  let mcpResponse: Response
  try {
    mcpResponse = await transport.handleRequest(request)
  } finally {
    // Clean up after response is ready (transport is stateless)
    transport.close().catch(() => {})
    server.close().catch(() => {})
  }

  // Merge MCP response headers with CORS headers
  const headers = new Headers(mcpResponse.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value)
  }

  return new Response(mcpResponse.body, {
    status: mcpResponse.status,
    statusText: mcpResponse.statusText,
    headers,
  })
}

// ─── Route exports ────────────────────────────────────────────────────────────

export async function OPTIONS(): Promise<Response> {
  return corsResponse(204)
}

export async function POST(request: Request): Promise<Response> {
  return handleMcp(request)
}

export async function GET(request: Request): Promise<Response> {
  return handleMcp(request)
}

export async function DELETE(request: Request): Promise<Response> {
  return handleMcp(request)
}
