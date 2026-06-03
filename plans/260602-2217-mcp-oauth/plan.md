# MCP OAuth 2.1 — Embedded Authorization Server cho `/api/mcp`

**Date:** 2026-06-02 22:17 (UTC+7)
**Scope:** `src/app/(payload)/api/mcp/`, `src/app/(payload)/api/oauth/`, `src/app/(payload)/api/well-known/`, `src/collections/`, `src/oauth/` (mới), `src/payload.config.ts`, `next.config.ts`, `.env.example`, `package.json`
**Trigger:** ChatGPT (developer-mode MCP connector) từ chối kết nối tới MCP server chỉ dùng Bearer API key tĩnh; nó yêu cầu một luồng OAuth 2.1 đầy đủ (PKCE + discovery metadata + Dynamic Client Registration). Mục tiêu: người dùng bấm "Connect" trong ChatGPT, đăng nhập bằng tài khoản Payload, đồng ý cấp quyền, và ChatGPT gọi được các tool MCP. Đồng thời KHÔNG phá vỡ các client hiện đang dùng `MCP_API_KEY`.

## 1. Goal

Sau khi hoàn thành, app sẽ tự đóng vai trò **OAuth 2.1 Authorization Server + Resource Server** ngay trong Next.js/Payload, không phụ thuộc IdP bên ngoài:

- Phục vụ discovery: `GET /.well-known/oauth-protected-resource` (RFC 9728) và `GET /.well-known/oauth-authorization-server` (RFC 8414), cùng `GET /api/oauth/jwks`.
- Cấp client động: `POST /api/oauth/register` (DCR — RFC 7591).
- Luồng authorization code + PKCE (S256): `GET|POST /api/oauth/authorize` (login + consent tái dùng Payload Users), `POST /api/oauth/token` (đổi code → access token JWT + refresh token).
- `POST /api/mcp` chấp nhận **một trong hai**: Bearer JWT hợp lệ (verify iss/aud/exp/scope/chữ ký) **hoặc** `MCP_API_KEY` legacy. Khi thiếu/sai token, trả `401` kèm header `WWW-Authenticate: Bearer resource_metadata="…"` để client khởi động luồng OAuth.
- Token gắn với một Payload user cụ thể (audit được), nhưng tool vẫn chạy `overrideAccess: true` như hiện tại.

## 2. Quyết định đã chốt (từ Q&A 2 vòng)

| Câu hỏi | Lựa chọn |
|---|---|
| Authorization Server | **Embedded** trong app; login tái dùng Payload Users (không IdP ngoài) |
| Phương thức đăng ký client | **DCR (RFC 7591)** — mở `/api/oauth/register`, lưu client vào MongoDB. CIMD để dành phase sau nếu cần |
| Backward compatibility | **Giữ cả hai** — `/api/mcp` chấp nhận JWT OAuth *hoặc* `MCP_API_KEY` tĩnh |
| Mô hình quyền | Access token **gắn user** (claim `sub` = user id) để audit; tool vẫn `overrideAccess: true` (giữ nguyên hành vi) |
| Ai được consent | **Mọi Payload user đã đăng nhập** (xem Lưu ý A bên dưới — Users chưa có field `roles`) |
| Thuật toán ký token | **RS256** + JWKS công khai; private key trong env `OAUTH_JWT_PRIVATE_KEY` |
| Lưu state OAuth | **MongoDB qua Payload collections** (app chạy serverless trên Netlify → không dùng in-memory được) |

> **Lưu ý A — Users chưa có `roles`:** Collection `users` hiện chỉ có `name` + auth; mọi user đăng nhập đều full quyền (`authenticated`). Vì vậy "chỉ role được phép consent" CHƯA khả thi nếu không thêm field. Quyết định: phase này cho **mọi user đã đăng nhập** consent được. Thêm field `roles` + giới hạn theo role là **out-of-scope** (xem §8), có thể làm task riêng sau.

## 3. State machine — Authorization Code + PKCE (có lifecycle)

```
                 ChatGPT (MCP client)                         App (AS + RS)
  ─────────────────────────────────────────────────────────────────────────────
  1. GET /api/mcp (no token)
                                         ◄── 401 + WWW-Authenticate: resource_metadata
  2. GET /.well-known/oauth-protected-resource   ──►  { resource, authorization_servers:[ISSUER] }
  3. GET /.well-known/oauth-authorization-server ──►  { authorization_endpoint, token_endpoint,
                                                        registration_endpoint, jwks_uri, ... }
  4. POST /api/oauth/register (DCR)              ──►  { client_id, ... }  [INSERT oauth-clients]
  5. GET /api/oauth/authorize?client_id&redirect_uri&code_challenge&state&resource&scope
        ├─ user CHƯA đăng nhập ──► render login form ──(POST creds)──► payload.login → set cookie
        └─ user ĐÃ đăng nhập   ──► render consent (Approve/Deny)
  6. POST /api/oauth/authorize (Approve)         ──►  302 redirect_uri?code=…&state=…
                                                      [INSERT oauth-codes: used=false, exp=+10m]
  7. POST /api/oauth/token (grant=authorization_code, code, code_verifier, redirect_uri, resource)
        ├─ verify PKCE: SHA256(code_verifier)==code_challenge
        ├─ code chưa used + chưa hết hạn + đúng client + đúng redirect_uri
        └─ mark code.used=true (one-time)  ──►  { access_token(JWT RS256), refresh_token, expires_in }
                                                 [INSERT oauth-refresh-tokens: token_hash]
  8. POST /api/mcp  Authorization: Bearer <JWT>  ──►  verify(iss,aud,exp,sig,scope) → run tools
  9. (hết hạn) POST /api/oauth/token (grant=refresh_token, refresh_token)
        └─ token_hash khớp + chưa revoked + chưa hết hạn ──► access_token mới (+ rotate refresh)
```

**Quy tắc chống lỗi tinh vi:**
- **Code dùng lại:** mỗi `oauth-codes` row có `used`. `/token` set `used=true` *atomically* (find với `used:false` rồi update; nếu đã used → reject 400 `invalid_grant` VÀ revoke mọi refresh token cấp từ code đó — dấu hiệu bị đánh cắp).
- **Code hết hạn:** `expires_at` = +10 phút; quá hạn → `invalid_grant`.
- **PKCE bắt buộc:** không có `code_challenge` ở bước authorize → reject; `code_challenge_method` chỉ chấp nhận `S256`.
- **Refresh rotation:** mỗi lần refresh, revoke token cũ + cấp token mới (`token_hash` mới).
- **Resource binding (RFC 8707):** `resource` phải khớp `MCP_RESOURCE`; access token `aud` = `resource`.

## 4. Schema — Payload collections mới (MongoDB)

> Payload không dùng SQL; dưới đây là field spec. Tất cả 3 collection: `access` từ chối public hoàn toàn (chỉ thao tác qua route handler với `overrideAccess`), `admin.hidden: true`.

**`oauth-clients`** (slug `oauth-clients`) — client đăng ký qua DCR
| field | type | ghi chú |
|---|---|---|
| `client_id` | text | unique, index |
| `client_secret` | text | optional; public client (PKCE) để trống |
| `client_name` | text | từ DCR metadata |
| `redirect_uris` | array<{ uri: text }> | ít nhất 1 |
| `grant_types` | json/array | mặc định `["authorization_code","refresh_token"]` |
| `token_endpoint_auth_method` | text | `none` (public) \| `client_secret_post` |
| `scope` | text | mặc định `mcp` |

**`oauth-codes`** (slug `oauth-codes`) — authorization code, ngắn hạn, one-time
| field | type | ghi chú |
|---|---|---|
| `code` | text | unique, index |
| `client_id` | text | index |
| `user` | relationship → `users` | chủ thể |
| `redirect_uri` | text | phải khớp khi đổi token |
| `code_challenge` | text | PKCE |
| `code_challenge_method` | text | chỉ `S256` |
| `scope` | text | |
| `resource` | text | RFC 8707 |
| `expires_at` | date | index; +10 phút |
| `used` | checkbox | default false |

**`oauth-refresh-tokens`** (slug `oauth-refresh-tokens`)
| field | type | ghi chú |
|---|---|---|
| `token_hash` | text | unique, index — lưu SHA-256(refresh_token), KHÔNG lưu raw |
| `client_id` | text | index |
| `user` | relationship → `users` | |
| `scope` | text | |
| `resource` | text | |
| `expires_at` | date | index; +30 ngày |
| `revoked` | checkbox | default false |

## 5. DTO / shapes (verbatim)

**Access token JWT claims (RS256):**
```jsonc
{
  "iss": "<OAUTH_ISSUER>",            // = base URL
  "sub": "<payload user id>",
  "aud": "<MCP_RESOURCE>",            // = `${ISSUER}/api/mcp`
  "client_id": "<client_id>",
  "scope": "mcp",
  "iat": 1730000000,
  "exp": 1730003600                   // +OAUTH_ACCESS_TOKEN_TTL (default 3600s)
}
```

**Protected Resource Metadata** `GET /.well-known/oauth-protected-resource`:
```jsonc
{
  "resource": "<ISSUER>/api/mcp",
  "authorization_servers": ["<ISSUER>"],
  "scopes_supported": ["mcp"],
  "bearer_methods_supported": ["header"]
}
```

**Authorization Server Metadata** `GET /.well-known/oauth-authorization-server`:
```jsonc
{
  "issuer": "<ISSUER>",
  "authorization_endpoint": "<ISSUER>/api/oauth/authorize",
  "token_endpoint": "<ISSUER>/api/oauth/token",
  "registration_endpoint": "<ISSUER>/api/oauth/register",
  "jwks_uri": "<ISSUER>/api/oauth/jwks",
  "scopes_supported": ["mcp"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none", "client_secret_post"]
}
```

**DCR request/response** `POST /api/oauth/register`:
```jsonc
// req  (RFC 7591)
{ "client_name": "ChatGPT", "redirect_uris": ["https://chatgpt.com/connector_platform_oauth_redirect"],
  "grant_types": ["authorization_code","refresh_token"], "token_endpoint_auth_method": "none" }
// res 201
{ "client_id": "mcp_<random>", "client_name": "ChatGPT", "redirect_uris": [...],
  "grant_types": [...], "token_endpoint_auth_method": "none" }
```

## 6. Phase breakdown

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | phase-01-foundation.md | 3 collection OAuth + module `src/oauth/` (config, JWT RS256, PKCE, helper) + env + đăng ký collection | — |
| 02 | phase-02-discovery-metadata.md | `.well-known` PRM + AS metadata + `/api/oauth/jwks` + rewrite trong next.config | 01 |
| 03 | phase-03-authorize-login-consent.md | `GET\|POST /api/oauth/authorize`: validate params + login/consent (Payload) + phát code | 01 |
| 04 | phase-04-token-dcr.md | `POST /api/oauth/register` (DCR) + `POST /api/oauth/token` (code+PKCE, refresh) | 01, 03 |
| 05 | phase-05-resource-server-guard.md | Sửa `/api/mcp`: verify JWT **hoặc** API key + 401 `WWW-Authenticate` + gắn user; test end-to-end ChatGPT | 02, 04 |

DAG: 01 → {02, 03}; 03 → 04; {02, 04} → 05. Không vòng lặp.

## 7. (Không áp dụng — chưa có plan revert trước đó)

## 8. Phạm vi (In / Out)

**In scope:**
- 3 collection mới + đăng ký trong `payload.config.ts`.
- Module `src/oauth/` (config, crypto JWT/JWKS, PKCE, validators, store helpers).
- Route handlers: `api/oauth/{authorize,token,register,jwks}`, `api/well-known/{oauth-protected-resource,oauth-authorization-server}`.
- `rewrite` trong `next.config.ts` map `/.well-known/*` → `/api/well-known/*`.
- Sửa `api/mcp/route.ts`: dual auth (JWT + legacy key) + `WWW-Authenticate`.
- Thêm dep `jose`. Cập nhật `.env.example` + Netlify secrets-scan omit (netlify.toml) cho key mới.

**Out of scope (KHÔNG làm trong task này):**
- Thêm field `roles` cho Users và giới hạn consent theo role (Lưu ý A) — task riêng.
- CIMD (Client ID Metadata Documents) — chỉ làm DCR.
- Thực thi access-control theo từng user (bỏ `overrideAccess`) — giữ nguyên `overrideAccess: true`.
- UI quản trị danh sách client/đã cấp quyền, nút revoke trong admin (collections để `hidden`).
- Rate-limiting / brute-force protection cho login form (ghi nhận ở Risks).
- Refactor logic tool trong `src/mcp/tools/*` — không đụng.

## 9. Risks

- **Next.js bỏ qua thư mục `.well-known` (dotfolder):** route handlers đặt tại `api/well-known/*`, cần `rewrite` trong `next.config.ts`. *Mitigation:* acceptance check curl đúng path `/.well-known/...` ở phase 02; verify không có locale-prefix/redirect chen vào (repo không có middleware next-intl nên rủi ro thấp).
- **Tự cuộn crypto OAuth/JWT:** rủi ro lỗi bảo mật. *Mitigation:* dùng `jose` (chuẩn, đã kiểm thử) cho ký/verify + PKCE bằng WebCrypto `subtle.digest`; tuân thủ chặt PKCE S256, one-time code, refresh rotation, aud binding.
- **State trên serverless:** in-memory không chia sẻ giữa các lambda Netlify. *Mitigation:* mọi state (clients, codes, refresh) trong MongoDB; access token JWT stateless (không cần lookup).
- **Private key trong env:** PEM nhiều dòng dễ hỏng khi cấu hình Netlify. *Mitigation:* lưu base64 1 dòng, decode lúc load; thêm vào `SECRETS_SCAN_OMIT_KEYS` của netlify.toml.
- **Payload login trong route handler ngoài /admin:** cần xác minh `payload.login`/`payload.auth` hoạt động qua REST cookie trong popup OAuth. *Mitigation:* phase 03 dùng form login tự render gọi `payload.login` rồi set cookie (không phụ thuộc redirect của /admin); có acceptance check thủ công.
- **Server restart/redeploy khi đang có code PENDING:** code nằm trong DB nên sống sót; chỉ token cũ vẫn hợp lệ tới khi `exp`. *Mitigation:* TTL ngắn (10m code, 1h access); chấp nhận được.
- **redirect_uri của ChatGPT thay đổi:** DCR nhận redirect_uri từ client nên tự thích nghi; ta validate exact-match khi đổi token. *Acceptable.*
