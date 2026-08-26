# Gỡ tính năng Redirects

**Date:** 2026-08-26 09:49 (Asia/Ho_Chi_Minh)
**Scope:** `src/plugins/`, `src/components/PayloadRedirects/`, `src/utilities/`, `src/hooks/`, `src/app/(frontend)/[locale]/`, `package.json`
**Trigger:** Không có luật redirect nào đang dùng và không chỗ nào trong code cần tới. Gỡ để bớt một collection trong admin và một dependency.

## 1. Goal

Không còn collection Redirects trong admin, không còn component `PayloadRedirects`, không còn dependency `@payloadcms/plugin-redirects`. Bốn trang đang dùng component này chuyển sang gọi thẳng `notFound()`. Hành vi 404 giữ nguyên như hiện tại.

## 2. Kiểm chứng (Phase A1)

| Sự thật | Bằng chứng |
|---|---|
| Không có luật redirect nào | `payload.find({ collection: 'redirects' })` → `0` trên DB hiện tại |
| Không link cứng nào cần redirect | Quét `href` nội bộ: chỉ `/career`, `/posts`, `/favicon` — đều có route thật |
| Link nội bộ từ CMS tự bám slug | `CMSLink` dùng `reference` theo id, resolve slug lúc render |
| Link email không phụ thuộc redirects | `localePrefix` mặc định `'always'` → `src/proxy.ts` tự chuyển `/posts/x` sang `/en/posts/x` |
| `getDocument.ts` và `getRedirects.ts` chỉ phục vụ redirects | `grep` → chỉ `PayloadRedirects/index.tsx` import |
| Route category vốn đã không dùng redirects | `posts/category/[slug]/page.tsx:35` gọi thẳng `notFound()` |

### Cảnh báo chưa gỡ được

DB mà `.env` trỏ tới rỗng, nên con số `0 redirects` **không chứng minh production cũng rỗng**. Nếu production đang có luật redirect hoạt động, commit này sẽ giết chúng: link cũ đang chuyển hướng ngon sẽ thành 404.

Đã nêu với user trước khi làm. **Cần đếm lại trên DB thật trước khi deploy:**

```
db.redirects.countDocuments({})
```

Khác 0 thì phải chép các luật đó ra trước, rồi tự quyết xử lý thế nào (dựng lại ở tầng `next.config`, hoặc chấp nhận mất).

## 3. Component đang làm hai việc — chỉ một việc cần thay

`PayloadRedirects` được dùng theo hai kiểu ở mỗi trang:

```tsx
// A. nhánh không tìm thấy nội dung
if (!page) return <PayloadRedirects url={url} />

// B. đặt xen giữa nội dung, luôn render
<PayloadRedirects disableNotFound url={url} />
```

- **A** kết thúc bằng `notFound()` khi không khớp luật nào → thay bằng `notFound()` trực tiếp. **Hành vi giữ nguyên.**
- **B** trả `null` khi không khớp → xóa hẳn, không cần thay gì.

Đây là điểm dễ sai duy nhất của task: quên thay A bằng `notFound()` sẽ khiến trang render trống thay vì 404.

## 4. Phase breakdown

| Phase | File | Mục tiêu |
|---|---|---|
| 01 | `phase-01-remove-redirects.md` | Gỡ trọn bộ, thay A bằng `notFound()` |

Một phase — thay đổi cơ học, không có phụ thuộc nội bộ cần tách.

## 5. Phạm vi

**In scope**
- `src/plugins/index.ts` — bỏ `redirectsPlugin` + import
- `src/components/PayloadRedirects/` — XÓA
- `src/utilities/getRedirects.ts` — XÓA
- `src/utilities/getDocument.ts` — XÓA
- `src/hooks/revalidateRedirects.ts` — XÓA
- 4 trang: `[locale]/page.tsx`, `[locale]/career/page.tsx`, `[locale]/[slug]/page.tsx`, `[locale]/posts/[slug]/page.tsx`
- `package.json` — gỡ `@payloadcms/plugin-redirects` bằng `pnpm remove`

**Out of scope**
- Không đụng `redirects.ts` ở gốc repo — đó là redirect IE của `next.config`, không liên quan plugin.
- Không đụng `src/proxy.ts` (định tuyến ngôn ngữ).
- Không thêm redirect thay thế ở tầng nào khác.
- Không xử lý trang còn `formBlock` mồ côi — việc riêng, đã nêu ở lượt trước.

## 6. Rủi ro

- **Production còn luật redirect.** Xem §2. Không kiểm được từ đây; phải đếm trước khi deploy.
- **Quên thay `notFound()`** → trang trắng trả 200 thay vì 404. Giảm thiểu: acceptance criteria kiểm cả 4 route bằng mã HTTP thật, không chỉ đọc code.
- **Biến `url` thành thừa** sau khi gỡ → lint/tsc cảnh báo. Giảm thiểu: xóa luôn khai báo trong cùng lần sửa.
- **Lockfile lệch `package.json`** làm hỏng `pnpm install --frozen-lockfile` trong Dockerfile. Giảm thiểu: dùng `pnpm remove`, không sửa tay — bài học từ phase 07 plan tối ưu hiệu năng.
