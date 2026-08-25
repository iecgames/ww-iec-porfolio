# Phase 04 — Gate AdminBar bằng cookie

**Goal:** Khách vãng lai không còn kích hoạt request `/api/users/me` nào. Admin đã đăng nhập vẫn thấy AdminBar y như trước.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/app/(frontend)/[locale]/layout.tsx` | MODIFY — đọc cookie, render AdminBar có điều kiện |
| `src/components/AdminBar/index.tsx` | MODIFY (nếu cần) — nhận prop, bỏ state `show` tự dò |

## 2. Cách làm

Layout đã là server component và đã gọi `draftMode()` nên việc đọc `cookies()` không làm route "dynamic hơn" so với hiện tại.

```ts
import { cookies, draftMode } from 'next/headers'

const cookieStore = await cookies()
const hasAuthCookie = Boolean(cookieStore.get('payload-token'))
```

```tsx
{hasAuthCookie && <AdminBar adminBarProps={{ preview: isEnabled }} />}
```

Tên cookie mặc định của Payload là `payload-token`. **Phải xác nhận** giá trị thực tế trong `payload.config.ts` / `Users` collection (có thể bị đổi qua `cookiePrefix`) trước khi hardcode.

Sự hiện diện của cookie chỉ dùng để **quyết định có render UI hay không** — không phải quyết định phân quyền. `PayloadAdminBar` bên trong vẫn tự gọi `/api/users/me` và tự xác thực; cookie giả chỉ khiến khách tự tốn thêm 1 request rồi không thấy gì. Không có rủi ro bảo mật.

## 3. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] Tab ẩn danh mở trang bất kỳ → DevTools Network **không** có request tới `/api/users/me`.
- [ ] Đăng nhập `/admin` rồi mở trang frontend → AdminBar hiện đúng như trước, nút Edit dẫn đúng collection.
- [ ] Bấm Preview từ admin → AdminBar hiện kèm nút thoát preview, `/next/exit-preview` vẫn chạy.
- [ ] Đăng xuất → reload trang frontend → AdminBar biến mất, không còn request `/api/users/me`.

## 4. Out of scope

- Không viết lại `PayloadAdminBar` của Payload.
- Không đụng luồng đăng nhập / `getMeUser.ts`.

## 5. Commit message dự kiến

```
perf(admin-bar): render the admin bar only for authenticated sessions

AdminBar mounted unconditionally in the locale layout and fetched
/api/users/me on mount, so every anonymous page view cost an extra API
round-trip just to decide the bar should stay hidden. The layout now
checks for the Payload auth cookie server-side and skips rendering
entirely when it is absent.

The cookie only gates the UI; PayloadAdminBar still authenticates its own
request, so a forged cookie reveals nothing.
```
