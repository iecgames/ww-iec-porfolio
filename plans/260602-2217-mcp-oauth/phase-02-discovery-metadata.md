# Phase 02 — Discovery metadata + JWKS

**Goal:** Sau phase này, client (ChatGPT/Claude) discover được server: `GET /.well-known/oauth-protected-resource` và `GET /.well-known/oauth-authorization-server` trả JSON đúng RFC, `GET /api/oauth/jwks` trả public key. Path `.well-known` thật sự truy cập được nhờ rewrite trong next.config.

## 1. Files chạm vào
| File | Action |
|---|---|
| `src/app/(payload)/api/well-known/oauth-protected-resource/route.ts` | CREATE |
| `src/app/(payload)/api/well-known/oauth-authorization-server/route.ts` | CREATE |
| `src/app/(payload)/api/oauth/jwks/route.ts` | CREATE |
| `next.config.ts` | MODIFY — thêm `async rewrites()` map `/.well-known/*` → `/api/well-known/*` |

## 2. Route handlers

**PRM** (`api/well-known/oauth-protected-resource/route.ts`):
```ts
import { ISSUER, MCP_RESOURCE, SUPPORTED_SCOPE } from '@/oauth/config'
const json = (b: unknown) => new Response(JSON.stringify(b), {
  status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
})
export function GET() {
  return json({
    resource: MCP_RESOURCE,
    authorization_servers: [ISSUER],
    scopes_supported: [SUPPORTED_SCOPE],
    bearer_methods_supported: ['header'],
  })
}
export function OPTIONS() { return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } }) }
```

**AS metadata** (`api/well-known/oauth-authorization-server/route.ts`):
```ts
import { ISSUER, OAUTH, SUPPORTED_SCOPE } from '@/oauth/config'
export function GET() {
  return json({
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
  })
}
```

**JWKS** (`api/oauth/jwks/route.ts`):
```ts
import { getPublicJwks } from '@/oauth/keys'
export async function GET() {
  return new Response(JSON.stringify(await getPublicJwks()), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' },
  })
}
```

## 3. next.config rewrite
```ts
// trong nextConfig:
async rewrites() {
  return [
    { source: '/.well-known/oauth-protected-resource', destination: '/api/well-known/oauth-protected-resource' },
    { source: '/.well-known/oauth-authorization-server', destination: '/api/well-known/oauth-authorization-server' },
  ]
}
```
> Một số client còn dò PRM theo path resource-specific `/.well-known/oauth-protected-resource/api/mcp`. Nếu acceptance phát hiện ChatGPT/Claude gọi path đó → thêm rewrite biến thể trỏ về cùng handler. Ghi nhận, chỉ thêm nếu cần.

## 3b. Encapsulation / wiring notes
- Đặt handler dưới route group `(payload)` để cùng cây với `/api/mcp` (đã hoạt động không qua middleware).
- Tách helper `json()` lặp lại sang `src/oauth/http.ts` nếu thấy trùng — tùy chọn, không bắt buộc.
- KHÔNG hardcode domain; mọi URL lấy từ `src/oauth/config.ts` (ISSUER).

## 4. Acceptance criteria
- [ ] `pnpm dev`, `curl -s http://localhost:3000/.well-known/oauth-protected-resource` → JSON có `resource` = `<ISSUER>/api/mcp`, `authorization_servers` = `[ISSUER]`.
- [ ] `curl -s http://localhost:3000/.well-known/oauth-authorization-server` → JSON có đủ 4 endpoint URL tuyệt đối + `code_challenge_methods_supported: ["S256"]`.
- [ ] `curl -s http://localhost:3000/api/oauth/jwks` → `{ keys: [ { kty:"RSA", kid:"iec-mcp-1", alg:"RS256", use:"sig", n, e } ] }` và **không** có field private (`d`, `p`, `q`...).
- [ ] `npx tsc --noEmit` pass.
- [ ] `OPTIONS /.well-known/oauth-protected-resource` → 204 + CORS header.
- [ ] (Regression) `/api/mcp` vẫn trả như cũ với `MCP_API_KEY`.

## 5. Out of scope (phase này)
- 401 `WWW-Authenticate` trên `/api/mcp` (phase 05).
- CIMD metadata.

## 6. Commit message dự kiến
```
feat(mcp-oauth): expose RFC 9728/8414 discovery + JWKS endpoints

Add /.well-known/oauth-protected-resource and
/.well-known/oauth-authorization-server (served via api/well-known/* with a
next.config rewrite, since Next ignores dot-prefixed dirs) plus
/api/oauth/jwks publishing the RS256 public key. All URLs derive from
src/oauth/config (ISSUER). Lets MCP clients discover the auth server.
```
