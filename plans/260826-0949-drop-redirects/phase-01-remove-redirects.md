# Phase 01 — Gỡ Redirects

**Goal:** Không còn collection Redirects, component, utility hay dependency nào của tính năng này. Bốn trang trả 404 đúng như trước.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/components/PayloadRedirects/index.tsx` | DELETE |
| `src/utilities/getRedirects.ts` | DELETE |
| `src/utilities/getDocument.ts` | DELETE |
| `src/hooks/revalidateRedirects.ts` | DELETE |
| `src/app/(frontend)/[locale]/page.tsx` | MODIFY |
| `src/app/(frontend)/[locale]/career/page.tsx` | MODIFY |
| `src/app/(frontend)/[locale]/[slug]/page.tsx` | MODIFY |
| `src/app/(frontend)/[locale]/posts/[slug]/page.tsx` | MODIFY |
| `src/plugins/index.ts` | MODIFY — sau cùng |
| `package.json` + `pnpm-lock.yaml` | MODIFY qua `pnpm remove` |
| `src/payload-types.ts`, `importMap.js` | REGENERATE |

## 2. Sửa mỗi trang

Ba việc, giống nhau ở cả bốn file:

1. Bỏ `import { PayloadRedirects }`
2. Đổi `return <PayloadRedirects url={url} />` → `notFound()`, thêm `import { notFound } from 'next/navigation'` nếu chưa có
3. Xóa dòng `<PayloadRedirects disableNotFound url={url} />` và khai báo `const url = ...` nếu không còn ai dùng

`[locale]/[slug]/page.tsx` giữ nguyên nhánh `homeStatic` — không liên quan.

## 3. Thứ tự

Sửa `plugins/index.ts` **sau cùng**, để `tsc` còn chỉ ra chỗ nào sót tham chiếu trước khi collection biến mất khỏi types.

## 4. Acceptance criteria

- [ ] `grep -rni "PayloadRedirects\|getCachedRedirects\|getCachedDocument\|revalidateRedirects\|plugin-redirects" src/` → 0 kết quả.
- [ ] `pnpm generate:types` + `pnpm generate:importmap` chạy xong.
- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] `pnpm remove @payloadcms/plugin-redirects` xong; `grep -c plugin-redirects package.json pnpm-lock.yaml` → 0 và 0.
- [ ] Admin không còn collection Redirects.
- [x] **404 kiểm bằng mã HTTP thật:**
  - `/vi/posts/khong-ton-tai` → **404** ✅
  - `/vi/khong-ton-tai` → **500** ❌ — xem §7, **không phải do phase này**
- [x] `/vi` → 200, `/vi/career` → 200, `/vi/posts` → 200.

## 7. Lỗi 500 trên `/[locale]/[slug]` — có sẵn, chưa tìm ra nguyên nhân

Phát hiện khi kiểm acceptance. **Không do việc gỡ redirects gây ra** — bằng chứng: `/vi/home` đi vào nhánh `homeStatic` nên **không bao giờ gọi `notFound()`**, vậy mà vẫn 500 y hệt.

Triệu chứng:

| Đường dẫn | Mã | Ghi chú |
|---|---|---|
| `/vi`, `/vi/career`, `/vi/posts` | 200 | route SSR thuần |
| `/vi/posts/khong-ton-tai` | 404 | đúng |
| `/vi/home`, `/vi/bat-ky` | **500** | route `[slug]` — ISR |

Lỗi: `DYNAMIC_SERVER_USAGE`, route `/(frontend)/[locale]/[slug]/page`, `revalidateReason: 'stale'`. **Chỉ xảy ra ở bản production** — `pnpm dev` trả 200 bình thường.

Đã loại trừ bằng cách tắt từng thứ rồi build lại và đo mã HTTP:

| Nghi vấn | Kết quả |
|---|---|
| `notFound()` thay cho `PayloadRedirects` (phase này) | vẫn 500 |
| `draftMode()` trong `[slug]/page.tsx` | vẫn 500 |
| `cookies()` trong `[locale]/layout.tsx` | vẫn 500 |
| `draftMode()` trong `[locale]/layout.tsx` | vẫn 500 |
| `getLocale()` trong `(frontend)/layout.tsx` (cả 2 chỗ) | vẫn 500 |
| `unstable_cache` trong `queryPageBySlug` | vẫn 500 |

Điểm chung của route hỏng: nó là route **duy nhất** vừa có `generateStaticParams` vừa nằm trong `prerender-manifest.dynamicRoutes`, tức được sinh theo kiểu ISR. `/[locale]` và `/[locale]/career` không có `generateStaticParams` nên render động và không dính.

Chưa xác định được API động nào bị gọi. Hướng điều tra tiếp: dựng lại một checkout ở commit trước phiên làm việc rồi build production để xác nhận dứt khoát là có sẵn (lần thử bằng `git worktree` thất bại do Turbopack không chạy được với `node_modules` là junction).

## 5. Out of scope

- Không đụng `redirects.ts` ở gốc (redirect IE của next.config).
- Không đụng `src/proxy.ts`.

## 6. Commit message dự kiến

```
refactor: drop the redirects feature

Nothing in the project relied on it: no redirect rules exist, every
hardcoded internal link resolves, and CMS links reference documents by id
so they follow slug changes on their own. The category archive never
consulted redirects to begin with — it calls notFound() directly.

The four pages that rendered PayloadRedirects now call notFound() where
the component would have ended up anyway, so a missing document still
returns 404 rather than an empty 200. getDocument and getRedirects go too;
PayloadRedirects was their only caller.

Leaves redirects.ts at the repo root alone — that is the next.config
rule for Internet Explorer, unrelated to the plugin.
```
