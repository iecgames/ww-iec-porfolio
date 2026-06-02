# Phase 04 — Token endpoint + Dynamic Client Registration

**Goal:** Sau phase này, `POST /api/oauth/register` (DCR) tạo client trong `oauth-clients`; `POST /api/oauth/token` đổi authorization code (kiểm PKCE, one-time, resource binding) lấy access token JWT + refresh token, và hỗ trợ `grant_type=refresh_token` (rotation). Luồng OAuth khép kín, test được bằng curl đầu-cuối.

## 1. Files chạm vào
| File | Action |
|---|---|
| `src/app/(payload)/api/oauth/register/route.ts` | CREATE — DCR |
| `src/app/(payload)/api/oauth/token/route.ts` | CREATE — token endpoint |
| `src/oauth/tokens.ts` | MODIFY — `consumeAuthCode`, `createRefreshToken`, `rotateRefreshToken`, `revokeRefreshByUserClient` |

## 2. DCR — `POST /api/oauth/register`
- Nhận JSON body (RFC 7591): `client_name?`, `redirect_uris` (>=1, bắt buộc), `grant_types?`, `token_endpoint_auth_method?`.
- Validate: `redirect_uris` là mảng URL https (cho phép http localhost khi dev). Thiếu → 400 `invalid_redirect_uri`.
- Sinh `client_id = 'mcp_' + randomToken(12)`. Nếu `token_endpoint_auth_method !== 'none'` → sinh `client_secret`.
- `payload.create({ collection:'oauth-clients', overrideAccess:true, data:{ client_id, client_secret, client_name, redirect_uris: uris.map(uri=>({uri})), grant_types: grant_types ?? ['authorization_code','refresh_token'], token_endpoint_auth_method: method ?? 'none', scope:'mcp' } })`.
- Trả 201 JSON: `client_id` (+`client_secret` nếu có) + metadata đã lưu. CORS `*`.

## 3. Token — `POST /api/oauth/token`
Body `application/x-www-form-urlencoded`. Phân nhánh theo `grant_type`:

**`authorization_code`:** params `code`, `code_verifier`, `redirect_uri`, `client_id`, (`resource`).
1. Tìm code: `find oauth-codes where code` + `overrideAccess`. Không thấy → 400 `invalid_grant`.
2. Nếu `used === true` → **reuse detected**: 400 `invalid_grant` VÀ `revokeRefreshByUserClient(user, client_id)` (phòng đánh cắp).
3. `expires_at < now` → 400 `invalid_grant`.
4. `client_id` khớp + `redirect_uri` khớp exact → nếu không → 400 `invalid_grant`.
5. PKCE: `verifyPkceS256(code_verifier, code.code_challenge)` false → 400 `invalid_grant`.
6. `resource` (nếu gửi) === `code.resource` (=== `MCP_RESOURCE`) → nếu lệch → 400 `invalid_target`.
7. **Atomic consume:** `update oauth-codes id set used=true` (chỉ khi đang false). 
8. `access_token = signAccessToken({ sub: code.user, client_id })`.
9. `refresh = randomToken(); createRefreshToken(payload,{ token_hash: hashToken(refresh), client_id, user, scope:'mcp', resource, expires_at: now+REFRESH_TOKEN_TTL })`.
10. Trả 200 JSON: `{ access_token, token_type:'Bearer', expires_in: ACCESS_TOKEN_TTL, refresh_token: refresh, scope:'mcp' }`. Header `Cache-Control: no-store`.

**`refresh_token`:** params `refresh_token`, `client_id`.
1. `find oauth-refresh-tokens where token_hash = hashToken(refresh_token)`. Không thấy / `revoked` / hết hạn → 400 `invalid_grant`.
2. `client_id` khớp → nếu không → 400.
3. **Rotate:** set row cũ `revoked=true`; tạo refresh mới (token_hash mới, cùng user/scope/resource, exp mới).
4. `access_token` mới qua `signAccessToken`. Trả JSON như trên với `refresh_token` mới.

**Confidential client:** nếu client `token_endpoint_auth_method='client_secret_post'` → yêu cầu `client_secret` khớp; public (`none`) → bỏ qua (chỉ dựa PKCE).

## 4. Encapsulation / wiring notes
- Tất cả store ops `overrideAccess:true`.
- Lỗi OAuth trả đúng khung: `{ "error": "...", "error_description": "..." }` + HTTP 400/401, `Content-Type: application/json`.
- `hashToken` để so khớp refresh (không lưu raw). `randomToken` từ `src/oauth/tokens.ts`.
- Không log `code_verifier`, `client_secret`, `refresh_token` raw.

## 5. Acceptance criteria (curl đầu-cuối)
- [ ] `POST /api/oauth/register` với `{"redirect_uris":["http://localhost:3000/cb"]}` → 201 + `client_id`; có row `oauth-clients`.
- [ ] Tạo `code_verifier` random, `code_challenge=base64url(sha256(verifier))`; chạy authorize (phase 03) Approve → lấy `code`.
- [ ] `POST /api/oauth/token` (`grant_type=authorization_code`, code, code_verifier, redirect_uri, client_id) → 200 `{access_token, refresh_token, expires_in:3600}`. `access_token` verify được bằng `verifyAccessToken` (sub = user id, aud = MCP_RESOURCE).
- [ ] Gọi lại `/token` với cùng `code` → 400 `invalid_grant`; refresh tokens của user/client đó bị `revoked=true`.
- [ ] `code_verifier` sai → 400 `invalid_grant`. `redirect_uri` sai → 400. `resource` lệch → `invalid_target`.
- [ ] `POST /api/oauth/token` (`grant_type=refresh_token`) → access token mới + refresh mới; refresh cũ → 400 `invalid_grant` (đã rotate).
- [ ] `npx tsc --noEmit` pass.

## 6. Out of scope (phase này)
- Gắn token vào `/api/mcp` (phase 05).
- Token introspection/revocation endpoint công khai (`/revoke`) — không cần cho ChatGPT.

## 7. Commit message dự kiến
```
feat(mcp-oauth): DCR + token endpoint (auth_code/PKCE + refresh rotation)

POST /api/oauth/register self-registers clients (RFC 7591) into
oauth-clients. POST /api/oauth/token exchanges one-time authorization codes
with S256 PKCE verification, redirect_uri + RFC 8707 resource binding, and
mints an RS256 access JWT plus a hashed refresh token. Refresh grant rotates
tokens; code reuse triggers invalid_grant and revokes the user's refresh
tokens. Completes the embedded OAuth 2.1 authorization server.
```
