# Phase 01 — Foundation: collections + crypto module + config

**Goal:** Sau phase này, MongoDB có 3 collection OAuth (migrate/boot sạch), tồn tại module `src/oauth/` cung cấp: load config từ env, ký+verify JWT RS256, export JWKS, verify PKCE S256, sinh token ngẫu nhiên, và các helper CRUD code/refresh. Chưa có HTTP endpoint nào — chỉ nền tảng để phase 02–05 dùng.

## 1. Files chạm vào
| File | Action |
|---|---|
| `package.json` | MODIFY — thêm dep `jose` |
| `src/collections/OAuthClients/index.ts` | CREATE |
| `src/collections/OAuthCodes/index.ts` | CREATE |
| `src/collections/OAuthRefreshTokens/index.ts` | CREATE |
| `src/payload.config.ts` | MODIFY — import + thêm 3 collection vào mảng `collections` |
| `src/oauth/config.ts` | CREATE — đọc env, hằng số (ISSUER, RESOURCE, TTL, scope, endpoints) |
| `src/oauth/keys.ts` | CREATE — load private key, export public JWK, kid |
| `src/oauth/jwt.ts` | CREATE — signAccessToken / verifyAccessToken (jose) |
| `src/oauth/pkce.ts` | CREATE — verifyPkceS256, sha256base64url |
| `src/oauth/tokens.ts` | CREATE — random token, sha256 hash, helper tạo/đọc code & refresh qua payload |
| `.env.example` | MODIFY — thêm các biến OAuth |
| `netlify.toml` | MODIFY — thêm key OAuth vào `SECRETS_SCAN_OMIT_KEYS` |

## 2. Collections (spec → code skeleton)

Tất cả 3 collection theo mẫu (ví dụ `OAuthClients`):
```ts
// src/collections/OAuthClients/index.ts
import type { CollectionConfig } from 'payload'

const denyAll = () => false

export const OAuthClients: CollectionConfig = {
  slug: 'oauth-clients',
  admin: { hidden: true },
  access: { create: denyAll, read: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: 'client_id', type: 'text', required: true, index: true, unique: true },
    { name: 'client_secret', type: 'text' },
    { name: 'client_name', type: 'text' },
    { name: 'redirect_uris', type: 'array', fields: [{ name: 'uri', type: 'text', required: true }] },
    { name: 'grant_types', type: 'json' },
    { name: 'token_endpoint_auth_method', type: 'text', defaultValue: 'none' },
    { name: 'scope', type: 'text', defaultValue: 'mcp' },
  ],
  timestamps: true,
}
```
> `access` deny-all an toàn vì mọi thao tác từ route handler dùng `payload.create/find/update({ overrideAccess: true })`. `admin.hidden` để khỏi lộ trong UI.

`OAuthCodes` fields: `code`(text,unique,index), `client_id`(text,index), `user`(relationship→users), `redirect_uri`(text), `code_challenge`(text), `code_challenge_method`(text), `scope`(text), `resource`(text), `expires_at`(date,index), `used`(checkbox,default false).

`OAuthRefreshTokens` fields: `token_hash`(text,unique,index), `client_id`(text,index), `user`(relationship→users), `scope`(text), `resource`(text), `expires_at`(date,index), `revoked`(checkbox,default false).

## 3. Module `src/oauth/`

**`config.ts`** — nguồn sự thật cho URL/hằng số:
```ts
import { getServerSideURL } from '@/utilities/getURL'

export const ISSUER = process.env.OAUTH_ISSUER || getServerSideURL()
export const MCP_RESOURCE = `${ISSUER}/api/mcp`
export const SUPPORTED_SCOPE = 'mcp'
export const ACCESS_TOKEN_TTL = Number(process.env.OAUTH_ACCESS_TOKEN_TTL ?? 3600)      // s
export const REFRESH_TOKEN_TTL = Number(process.env.OAUTH_REFRESH_TOKEN_TTL ?? 2592000) // 30d
export const CODE_TTL = 600                                                             // 10m
export const OAUTH = {
  authorization_endpoint: `${ISSUER}/api/oauth/authorize`,
  token_endpoint: `${ISSUER}/api/oauth/token`,
  registration_endpoint: `${ISSUER}/api/oauth/register`,
  jwks_uri: `${ISSUER}/api/oauth/jwks`,
}
```

**`keys.ts`** — RS256 key (private PKCS8 base64 trong env), cache module-level:
```ts
import { importPKCS8, exportJWK } from 'jose'
export const KID = process.env.OAUTH_JWT_KID || 'iec-mcp-1'
const ALG = 'RS256'
let _priv: CryptoKey | undefined
export async function getPrivateKey() {
  if (_priv) return _priv
  const pem = Buffer.from(process.env.OAUTH_JWT_PRIVATE_KEY || '', 'base64').toString('utf8')
  _priv = await importPKCS8(pem, ALG)
  return _priv
}
export async function getPublicJwks() {
  const jwk = await exportJWK(await getPrivateKey()) // jose dẫn xuất public từ private
  return { keys: [{ ...jwk, kid: KID, alg: ALG, use: 'sig' }] }
}
export { ALG }
```
> Lưu ý: `exportJWK(privateKey)` có thể kèm thành phần bí mật. An toàn hơn: import riêng public key. Khi execute, sinh **cặp** key và lưu CẢ public (PEM) vào env `OAUTH_JWT_PUBLIC_KEY`, dùng `importSPKI` cho JWKS để chắc chắn chỉ phát public. Sẽ chốt cách lấy public trong lúc code; tài liệu hoá ở §3 wiring.

**`jwt.ts`**:
```ts
import { SignJWT, jwtVerify } from 'jose'
import { getPrivateKey, getPublicKey, KID, ALG } from './keys'
import { ISSUER, MCP_RESOURCE, ACCESS_TOKEN_TTL, SUPPORTED_SCOPE } from './config'

export async function signAccessToken(opts: { sub: string; client_id: string; scope?: string }) {
  return new SignJWT({ client_id: opts.client_id, scope: opts.scope ?? SUPPORTED_SCOPE })
    .setProtectedHeader({ alg: ALG, kid: KID })
    .setIssuer(ISSUER).setSubject(opts.sub).setAudience(MCP_RESOURCE)
    .setIssuedAt().setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(await getPrivateKey())
}
export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, await getPublicKey(), {
    issuer: ISSUER, audience: MCP_RESOURCE,
  })
  return payload // { sub, client_id, scope, ... } — ném lỗi nếu sai/hết hạn
}
```

**`pkce.ts`**:
```ts
export function sha256base64url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  return crypto.subtle.digest('SHA-256', data).then((buf) =>
    Buffer.from(buf).toString('base64url'))
}
export async function verifyPkceS256(verifier: string, challenge: string) {
  return (await sha256base64url(verifier)) === challenge
}
```

**`tokens.ts`** — sinh token + hash + helper store (dùng `payload` truyền vào):
```ts
import type { Payload } from 'payload'
export const randomToken = (bytes = 32) => Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('base64url')
export const hashToken = (t: string) =>
  crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then((b) => Buffer.from(b).toString('hex'))
// createAuthCode / consumeAuthCode / createRefreshToken / rotateRefreshToken: bọc payload.create/find/update
// với overrideAccess:true. Chi tiết logic one-time + rotation ở phase 03/04.
```

## 4. Env + netlify

`.env.example` thêm:
```
# ── MCP OAuth (embedded Authorization Server) ────────────────────────────────
OAUTH_ISSUER=https://your-domain.example      # base URL công khai (mặc định = getServerSideURL)
OAUTH_JWT_PRIVATE_KEY=                          # PKCS8 PEM, base64 1 dòng
OAUTH_JWT_PUBLIC_KEY=                           # SPKI PEM, base64 1 dòng (cho JWKS)
OAUTH_JWT_KID=iec-mcp-1
OAUTH_ACCESS_TOKEN_TTL=3600
OAUTH_REFRESH_TOKEN_TTL=2592000
```
Lệnh sinh key (ghi vào README/PR, chạy 1 lần):
```
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out priv.pem
openssl pkey -in priv.pem -pubout -out pub.pem
# rồi base64 -w0 priv.pem / pub.pem để dán vào env
```
`netlify.toml`: thêm `OAUTH_JWT_PRIVATE_KEY`, `OAUTH_JWT_PUBLIC_KEY` vào `SECRETS_SCAN_OMIT_KEYS`.

## 5. Encapsulation / wiring notes
- Đăng ký 3 collection trong `src/payload.config.ts` mảng `collections` (cuối danh sách). Import từ `./collections/OAuthClients` v.v.
- Chỉ route handler được import `src/oauth/*`; tool MCP không đụng.
- `getPublicKey()` trong `keys.ts` phải trả **public-only** key (dùng `importSPKI(OAUTH_JWT_PUBLIC_KEY)`). Không verify bằng private key.
- Chạy `pnpm generate:types` sau khi thêm collection để cập nhật `payload-types.ts`.

## 6. Acceptance criteria
- [x] `pnpm install` thêm `jose` thành công; `package.json` có `jose`. → jose 6.2.3
- [x] `pnpm generate:types` chạy, `payload-types.ts` xuất hiện type cho 3 collection mới.
- [x] `pnpm dev` (hoặc build) boot không lỗi; 3 collection tạo được trong Mongo (dev server boot sạch, route collection phục vụ request).
- [x] `npx tsc --noEmit` pass. (Chỉ còn 1 lỗi CÓ SẴN ở tests/int/mcp-server.int.spec.ts:35 — tồn tại trên HEAD, không liên quan.)
- [x] Test nhanh (vitest): `signAccessToken` → `verifyAccessToken` trả `sub` đúng; token sửa → verify ném lỗi. (tests/int/oauth-foundation.int.spec.ts, 4/4 pass)
- [x] `verifyPkceS256(verifier, await sha256base64url(verifier))` === true; sai verifier === false.
- [x] Collections deny-all: public REST `GET /api/oauth-clients` → 403 Forbidden; `admin.hidden: true` đặt trong config.

## 5b. Out of scope (phase này)
- HTTP endpoints (.well-known, authorize, token, register, jwks) — phase 02–04.
- Logic one-time code / rotation đầy đủ — chỉ cần khung helper; ràng buộc nghiệp vụ thực thi ở phase 03/04.

## 6b. Commit message dự kiến
```
feat(mcp-oauth): add OAuth foundation — collections, JWT/PKCE crypto, config

Add oauth-clients/oauth-codes/oauth-refresh-tokens collections (deny-all
access, admin-hidden) and a self-contained src/oauth module: RS256 JWT
sign/verify via jose, S256 PKCE verification, JWKS export, and token
helpers. Register collections in payload.config and document new env vars.
No HTTP surface yet — this is the base for the AS/RS endpoints.
```
