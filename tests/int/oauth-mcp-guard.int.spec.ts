/**
 * @vitest-environment node
 *
 * Phase 05 acceptance — /api/mcp OAuth JWT auth and the
 * 401 WWW-Authenticate challenge. Tokens are minted directly with the same
 * key material the dev server verifies with. Requires a running dev server
 * (default http://localhost:3000).
 */
import { describe, expect, it } from 'vitest'

import { PRM_URL } from '@/oauth/config'
import { signAccessToken } from '@/oauth/jwt'

const BASE = process.env.OAUTH_TEST_URL || 'http://localhost:3000'

function mcp(token?: string): Promise<Response> {
  return fetch(`${BASE}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } },
    }),
  })
}

describe('/api/mcp — 401 challenge', () => {
  it('returns 401 with a WWW-Authenticate resource_metadata header when no token', async () => {
    const res = await mcp()
    expect(res.status).toBe(401)
    const wa = res.headers.get('www-authenticate') || ''
    expect(wa).toContain('resource_metadata=')
    expect(wa).toContain(PRM_URL)
  })

  it('returns 401 for a garbage token', async () => {
    const res = await mcp('not-a-real-token')
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('resource_metadata=')
  })

  it('returns 403 + scope challenge for a token without the mcp scope', async () => {
    const token = await signAccessToken({ sub: 'user-x', client_id: 'mcp_test', scope: 'other' })
    const res = await mcp(token)
    expect(res.status).toBe(403)
    expect(res.headers.get('www-authenticate')).toContain('scope="mcp"')
  })
})

describe('/api/mcp — accepted credentials', () => {
  it('accepts a valid OAuth access token (auth passes, MCP responds)', async () => {
    const token = await signAccessToken({ sub: 'user-x', client_id: 'mcp_test' })
    const res = await mcp(token)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('serverInfo')
    expect(text).not.toContain('Unauthorized')
  })
})
