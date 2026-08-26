# Phase 01 — Link trong email trỏ đúng domain

**Goal:** Link bài viết, link tuyển dụng và **link hủy đăng ký** trong email trỏ về domain thật thay vì `http://localhost:3000`.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/utilities/email/getUnsubscribeUrl.ts` | MODIFY |
| `src/utilities/email/sendCampaign.ts` | MODIFY |
| `.env.example` | MODIFY — ghi chú `SITE_URL` là tùy chọn |

## 2. Vấn đề

Cả hai file đọc `process.env.SITE_URL` với fallback thẳng về localhost:

```ts
const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
```

`SITE_URL` **không được định nghĩa ở đâu cả** — không có trong `.env` thật, `.env.example`, hay `docker-compose.yml`. Repo dùng `NEXT_PUBLIC_SERVER_URL`. Nên fallback luôn trúng, và mọi email gửi đi mang link localhost.

Link hủy đăng ký hỏng là phần nặng nhất: người nhận không thể tự rời danh sách.

## 3. Cách sửa

Dùng `getServerSideURL()` sẵn có trong `src/utilities/getURL.ts` — đã xử lý `NEXT_PUBLIC_SERVER_URL` và `VERCEL_PROJECT_PRODUCTION_URL`. Giữ `SITE_URL` làm override tùy chọn để không phá môi trường nào đang đặt sẵn:

```ts
import { getServerSideURL } from '@/utilities/getURL'

const siteUrl = (process.env.SITE_URL || getServerSideURL()).replace(/\/$/, '')
```

Đưa vào một helper dùng chung để hai file không trôi lệch nhau.

## 4. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] `grep -rn "SITE_URL ?? 'http://localhost" src/` → 0 kết quả.
- [ ] Với `NEXT_PUBLIC_SERVER_URL` trong `.env` hiện tại, in ra URL sinh bởi `getUnsubscribeUrl('abc')` → phải là domain thật, **không** phải localhost.
- [ ] Đặt tạm `SITE_URL` khác → URL đổi theo, xác nhận override vẫn còn tác dụng.
- [ ] Bỏ `SITE_URL` → quay về `NEXT_PUBLIC_SERVER_URL`.
- [ ] Kiểm tra bằng cách đọc HTML sinh ra, **không gửi email thật**.

## 5. Out of scope

- Không đổi route `/[locale]/unsubscribe`.
- Không đụng token hủy đăng ký.

## 6. Commit message dự kiến

```
fix(email): point campaign links at the real site URL

sendCampaign and getUnsubscribeUrl both read SITE_URL, an environment
variable this project never defines — not in .env, .env.example, or
docker-compose.yml, which all use NEXT_PUBLIC_SERVER_URL. Every campaign
therefore fell through to the localhost fallback, shipping post links,
job links and unsubscribe links that go nowhere for the recipient.

Both now resolve through getServerSideURL(), the helper the rest of the
app already uses, with SITE_URL kept as an optional override.
```
