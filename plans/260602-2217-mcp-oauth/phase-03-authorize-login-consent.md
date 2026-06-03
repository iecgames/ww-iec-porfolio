# Phase 03 — Authorize endpoint: login + consent + phát code

**Goal:** Sau phase này, `GET /api/oauth/authorize` validate đủ tham số OAuth/PKCE, yêu cầu đăng nhập bằng Payload user (form tự render gọi `payload.login`), hiển thị màn consent; `POST` khi Approve tạo `oauth-codes` (one-time, +10m) và 302 về `redirect_uri?code=…&state=…`.

## 1. Files chạm vào
| File | Action |
|---|---|
| `src/app/(payload)/api/oauth/authorize/route.ts` | CREATE — GET + POST |
| `src/oauth/authorize.ts` | CREATE — validate params, render HTML login/consent, helper |
| `src/oauth/tokens.ts` | MODIFY — thêm `createAuthCode(payload, {...})` |

## 2. Logic

**Validate (cả GET/POST), trả lỗi đúng cách:**
- `response_type` phải `code`; thiếu → 400.
- `client_id` phải tồn tại trong `oauth-clients`; không → 400 `invalid_client`.
- `redirect_uri` phải khớp **exact** một trong `redirect_uris` của client; không → 400 (KHÔNG redirect về uri chưa verify).
- `code_challenge` bắt buộc, `code_challenge_method` phải `S256`; thiếu/sai → redirect lỗi `invalid_request` về redirect_uri (kèm `state`).
- `scope`: chỉ `mcp` (hoặc rỗng → mặc định `mcp`).
- `resource` (RFC 8707): nếu có, phải === `MCP_RESOURCE`; lệch → `invalid_target`.
- `state`: bắt buộc echo lại nguyên văn ở mọi redirect.

**Xác thực user (tái dùng Payload):**
```ts
// xác định user hiện tại từ cookie session payload
const { user } = await payload.auth({ headers: request.headers })
```
- Nếu `user` null → render **form login** (email/password) cùng trang, hidden field giữ toàn bộ tham số authorize (đã validate) + một `request_token` (JWT ngắn hạn ký bằng OAUTH key bọc các tham số) để chống tamper.
- POST với `action=login`: gọi `await payload.login({ collection: 'users', data: { email, password } })`; nếu ok → set cookie `payload-token` (HttpOnly) từ kết quả, rồi render consent. Sai credential → render lại form + lỗi.

**Consent + phát code:**
- Khi đã có user → render trang consent: tên client, scope `mcp`, nút **Cho phép** / **Từ chối** (POST `action=consent`).
- POST `action=consent&decision=deny` → 302 `redirect_uri?error=access_denied&state=…`.
- POST `action=consent&decision=allow`:
  1. `code = randomToken()`.
  2. `createAuthCode(payload, { code, client_id, user: user.id, redirect_uri, code_challenge, code_challenge_method:'S256', scope, resource: MCP_RESOURCE, expires_at: now+CODE_TTL, used:false })`.
  3. 302 `redirect_uri?code=<code>&state=<state>`.

**HTML:** trang login/consent là HTML tối giản tự render (inline CSS), không cần React. Trả `Content-Type: text/html`.

## 3. Encapsulation / wiring notes
- `payload = await getPayload({ config })` trong handler (như `/api/mcp`).
- Mọi `payload.create/find` dùng `overrideAccess: true` (collection deny-all).
- `request_token`: ký bằng `src/oauth/keys` (RS256) hoặc HS bằng `PAYLOAD_SECRET`; TTL ~10m; verify lại ở POST để đảm bảo tham số authorize không bị sửa giữa GET→POST.
- KHÔNG tự xử lý mật khẩu — chỉ gọi `payload.login`. Cookie set đúng tên/flags Payload dùng (`payload-token`, HttpOnly, Secure ở prod, SameSite=Lax).
- Validate redirect_uri TRƯỚC khi redirect bất kỳ lỗi nào ra ngoài (chống open-redirect).

## 4. Acceptance criteria
> Tự động hoá: `tests/int/oauth-authorize.int.spec.ts` (seed client+user qua local API, chạy flow HTTP với dev server). 8/8 pass.
- [x] `GET /api/oauth/authorize?...` khi chưa login → HTML form login (200).
- [x] Submit sai mật khẩu → vẫn ở form + báo lỗi; submit đúng → màn consent + Set-Cookie `payload-token`.
- [x] **Cho phép** → 302 `Location: <redirect_uri>?code=…&state=xyz`; có 1 row `oauth-codes` (`used:false`, đúng `code_challenge`).
- [x] **Từ chối** → 302 `...?error=access_denied&state=xyz`; không tạo code.
- [x] `client_id` sai → 400 `invalid_client` (không redirect). Thiếu `code_challenge` → redirect `error=invalid_request&state=xyz`.
- [x] `resource` lệch `MCP_RESOURCE` → `invalid_target`.
- [x] `npx tsc --noEmit` pass.

## 5. Out of scope (phase này)
- Đổi code → token (phase 04).
- Giới hạn theo role (Lưu ý A — mọi user login đều consent được).
- Nhớ consent / skip consent lần sau.

## 6. Commit message dự kiến
```
feat(mcp-oauth): authorization endpoint with Payload login + consent

GET/POST /api/oauth/authorize validates client_id, exact redirect_uri,
PKCE (S256 required), and the RFC 8707 resource, then authenticates the
resource owner via payload.login (reusing Users) and renders a minimal
consent page. On approval it persists a one-time oauth-codes row (10m TTL)
and 302s back with code+state. Redirect-uri is verified before any error
redirect to prevent open redirects.
```
