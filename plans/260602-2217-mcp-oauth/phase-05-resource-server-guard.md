# Phase 05 — Resource server: bảo vệ `/api/mcp` (JWT + legacy key) + WWW-Authenticate

**Goal:** Sau phase này, `/api/mcp` chấp nhận Bearer là **JWT OAuth hợp lệ** hoặc **`MCP_API_KEY` legacy**; khi thiếu/sai trả `401` kèm `WWW-Authenticate: Bearer resource_metadata="…"` đúng RFC 9728 để client khởi động OAuth. Token JWT gắn user (claim `sub`) vào context. ChatGPT kết nối được end-to-end.

## 1. Files chạm vào
| File | Action |
|---|---|
| `src/app/(payload)/api/mcp/route.ts` | MODIFY — thay `isAuthorized` bằng `authenticate` dual-mode + 401 header |
| `src/oauth/config.ts` | MODIFY (nếu cần) — export URL PRM cho header |
| `src/mcp/server.ts` | MODIFY (tùy chọn) — `createMcpServer(payload, authContext?)` nhận user để audit |

## 2. Thay đổi `route.ts`

**Hàm auth mới (thay `isAuthorized`):**
```ts
import { verifyAccessToken } from '@/oauth/jwt'
import { ISSUER } from '@/oauth/config'

const PRM_URL = `${ISSUER}/.well-known/oauth-protected-resource`

type AuthResult =
  | { ok: true; mode: 'apikey' }
  | { ok: true; mode: 'oauth'; sub: string; client_id?: string }
  | { ok: false; error: string }

async function authenticate(request: Request): Promise<AuthResult> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return { ok: false, error: 'missing_token' }

  // 1) legacy API key
  const apiKey = process.env.MCP_API_KEY
  if (apiKey && token === apiKey) return { ok: true, mode: 'apikey' }

  // 2) OAuth JWT
  try {
    const claims = await verifyAccessToken(token) // kiểm iss/aud/exp/sig
    if (typeof claims.scope === 'string' && !claims.scope.split(' ').includes('mcp'))
      return { ok: false, error: 'insufficient_scope' }
    return { ok: true, mode: 'oauth', sub: String(claims.sub), client_id: claims.client_id as string }
  } catch {
    return { ok: false, error: 'invalid_token' }
  }
}

function unauthorized(error: string): Response {
  const scope = error === 'insufficient_scope' ? ', scope="mcp"' : ''
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null }),
    {
      status: error === 'insufficient_scope' ? 403 : 401,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${PRM_URL}"${scope}`,
      },
    },
  )
}
```

**Trong `handleMcp`:**
```ts
const auth = await authenticate(request)
if (!auth.ok) return unauthorized(auth.error)
// (tùy chọn) truyền auth.sub vào createMcpServer để audit log; tool vẫn overrideAccess
const server = createMcpServer(payload, auth.mode === 'oauth' ? { userId: auth.sub } : undefined)
```

> Giữ nguyên transport stateless, CORS, cleanup `finally`. Chỉ đổi khối auth + header 401. `Access-Control-Allow-Headers` đã có `Authorization` — không đổi. Thêm `WWW-Authenticate` vào `Access-Control-Expose-Headers` để browser-based client đọc được.

## 3. Encapsulation / wiring notes
- Thứ tự kiểm: API key trước (rẻ), rồi JWT. Cả hai fail → 401 kèm `WWW-Authenticate` (đây là tín hiệu để ChatGPT bắt đầu discovery → register → authorize).
- `createMcpServer` thêm tham số tùy chọn `authContext` — KHÔNG đổi hành vi tool (vẫn `overrideAccess:true`); chỉ dùng cho log/audit. Nếu không muốn chạm `server.ts`, có thể bỏ — đánh dấu optional.
- Không nới lỏng: token thiếu/sai luôn 401; scope sai 403.

## 4. Acceptance criteria
- [ ] Legacy: `POST /api/mcp` với `Authorization: Bearer <MCP_API_KEY>` + body `tools/list` → 200 danh sách tool (regression giữ nguyên).
- [ ] OAuth happy path: lấy access token (phase 04), `POST /api/mcp` với `Bearer <JWT>` + `tools/list` → 200.
- [ ] Không token → 401 + header `WWW-Authenticate: Bearer resource_metadata="<ISSUER>/.well-known/oauth-protected-resource"`.
- [ ] Token sai chữ ký / hết hạn / `aud` lệch → 401 + cùng header. Token scope không có `mcp` → 403.
- [ ] `npx tsc --noEmit` pass; `pnpm build` thành công.
- [ ] **End-to-end ChatGPT (thủ công):** thêm connector trỏ `https://<domain>/api/mcp` ở developer mode → ChatGPT discover PRM/AS → DCR → mở popup login Payload → consent → gọi `tools/list` thành công. Ghi lại kết quả vào PR.
- [ ] (Tùy chọn) MCP Inspector (`pnpm test:mcp`) kết nối qua OAuth flow OK.

## 5. Out of scope (phase này)
- Per-user access enforcement (vẫn overrideAccess).
- Hiển thị/lọc tool theo client.

## 6. Commit message dự kiến
```
feat(mcp-oauth): protect /api/mcp with OAuth JWT + legacy key, add 401 challenge

/api/mcp now accepts either a valid RS256 OAuth access token (iss/aud/exp/
scope verified) or the legacy MCP_API_KEY. Unauthenticated requests return
401 with a WWW-Authenticate: Bearer resource_metadata header (RFC 9728) so
MCP clients (ChatGPT) auto-start the OAuth flow. OAuth tokens carry the
Payload user id for audit; tools keep overrideAccess. Backward compatible.
```
