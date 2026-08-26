# Một bản logic phân giải link, và link nội bộ giữ đúng ngôn ngữ

**Date:** 2026-08-26 14:20 (Asia/Ho_Chi_Minh)
**Scope:** `src/components/Link/`, `src/utilities/resolveLinkHref.ts`, `src/heros/`, `src/blocks/`, `src/Header/`, `src/Footer/`, `src/components/`, `src/app/(frontend)/[locale]/`
**Trigger:** Logic phân giải link tồn tại hai bản độc lập và đã lệch nhau. Đồng thời link nội bộ dùng `next/link` trần nên bấm từ `/vi` bị đẩy sang `/en`, mất ngôn ngữ đang xem.

## 1. Goal

Chỉ còn **một** hàm quyết định href từ field `link`. Bấm link nội bộ ở `/vi` thì ở lại `/vi`, không qua vòng redirect nào. Link ngoài, `mailto:`, `tel:` và anchor `#` giữ nguyên hành vi.

## 2. Kiểm chứng (Phase A1) — đã đọc code, không suy đoán

### Hai bản phân giải đã lệch

`CMSLink` (`components/Link/index.tsx:38`) tự viết if/else. `resolveLinkHref` (`utilities/resolveLinkHref.ts`) viết lại — docstring tự nhận *"Mirrors the branching in CMSLink"*. `CMSLink` **không** gọi hàm kia.

Khác biệt thật, không phải lý thuyết:

| Trường hợp | `CMSLink` | `resolveLinkHref` |
|---|---|---|
| `type` null / lạ | rơi về `url` | trả `null` |
| `type === 'custom'` | rơi về `url` | trả `url` + cờ `external` |
| Khái niệm `external` | không có, dùng prop `newTab` | tính bằng `^https?://` |

### Cách next-intl xử lý href — nền tảng cho quyết định thay hàng loạt

`node_modules/next-intl/dist/esm/development/shared/utils.js:1-14`:

```js
isLocalizableHref(href) = isLocalHref(href) && !isRelativeHref(href)
// isLocalHref   : false nếu có protocol  (https:, mailto:, tel:)
// isRelativeHref: true  nếu không bắt đầu bằng '/'
```

Nghĩa là `Link` của next-intl **chỉ** gắn tiền tố locale cho href bắt đầu bằng `/` và không có protocol:

| href | Kết quả |
|---|---|
| `/posts` | `/vi/posts` ✅ |
| `https://…` | giữ nguyên ✅ |
| `mailto:` / `tel:` | giữ nguyên ✅ |
| `#lien-he` | giữ nguyên ✅ |

Vì vậy thay `next/link` bằng `@/i18n/navigation` **an toàn cho mọi loại href đang dùng**, không cần rẽ nhánh thủ công.

### Anchor lưu dạng nào

`fields/SectionSelect.tsx:36` lưu `` `#${anchor}` `` — có dấu `#` ở đầu, nên rơi vào nhánh "giữ nguyên". Đúng ý.

### Hiện trạng

19 file import `next/link`; đúng **một** file (`SearchModal`) dùng `Link` locale-aware. `RippleLink` bọc `next/link`, nên sửa nó là kéo theo mọi nơi dùng ripple.

## 3. Quyết định

| Câu hỏi | Chốt |
|---|---|
| Bản logic nào giữ lại | **`resolveLinkHref`** — nó đã tách rời, có kiểu rõ ràng, và trả thêm cờ `external`. `CMSLink` gọi vào nó |
| Nhánh `type` null/lạ | Theo `CMSLink` hiện tại: **rơi về `url`**. Đổi sang `null` sẽ làm biến mất link của doc cũ chưa set `type` |
| Phạm vi sửa locale | **Toàn bộ** file render link nội bộ, không chỉ `CMSLink` — sửa nửa vời thì Header đúng mà JobCard vẫn sai, khó lần ra hơn là để nguyên |

## 4. Phase breakdown

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | `phase-01-unify-resolver.md` | `CMSLink` dùng `resolveLinkHref`; giữ nguyên hành vi hiện tại | — |
| 02 | `phase-02-locale-links.md` | Link nội bộ giữ locale trên toàn app | 01 |

01 trước để phase 02 chỉ phải đụng đúng một chỗ sinh href.

## 5. Phạm vi

**In scope**
- `src/utilities/resolveLinkHref.ts` — nhận thêm nhánh fallback
- `src/components/Link/index.tsx` — bỏ if/else, gọi helper, đổi sang Link locale-aware
- 18 file còn lại đang dùng `next/link` cho điều hướng nội bộ
- `src/components/RippleLink/index.tsx`

**Out of scope**
- Không đổi `defaultLocale` (`en`) — đó là quyết định sản phẩm, và ảnh hưởng cả link trong email
- Không đụng `src/proxy.ts`
- Không sửa mô tả "Search" sai trong `fields/link.ts` — việc riêng, đã nêu ở lượt trước
- Không đụng `components/ui/pagination.tsx` và `components/Pagination/` — đã xác định là file chết ở lượt rà soát trước, sửa chúng là lãng phí
- Không đổi `next/link` trong `src/app/(payload)` (admin panel)

## 6. Rủi ro

- **Link ngoài bị gắn nhầm tiền tố locale.** Đã loại trừ bằng §2 — `isLocalizableHref` chặn theo protocol. Acceptance criteria vẫn kiểm bằng HTML thật cho `https:`, `mailto:`, `tel:`, `#`.
- **`Link` của next-intl không dùng được trong Server Component.** `createNavigation` có bản `react-server` riêng nên chạy được cả hai phía — nhưng phải xác nhận bằng build thật, vì phần lớn 18 file là server component.
- **Đổi hành vi nhánh `type` null** làm mất link của dữ liệu cũ. Giảm thiểu: giữ đúng fallback `url` của `CMSLink`, ghi rõ trong §3.
- **Bỏ sót file** → nửa app đúng, nửa sai, khó phát hiện hơn là để nguyên. Giảm thiểu: acceptance criteria dùng `grep` đếm số file còn `next/link`, không đếm bằng mắt.
