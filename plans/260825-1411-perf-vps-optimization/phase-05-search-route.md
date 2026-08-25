# Phase 05 — Gộp search về 1 route

**Goal:** Mỗi lần gõ (sau debounce) chỉ còn 1 request thay vì 6. Kết quả hiển thị giống hệt hiện tại.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/app/(frontend)/api/site-search/route.ts` | CREATE |
| `src/components/SearchModal/index.tsx` | MODIFY — thay 6 fetch bằng 1 |

> Route đặt trong nhóm `(frontend)` để không lẫn với `(payload)/api/*` vốn do Payload sở hữu. Xác nhận không đụng catch-all `(payload)/api/[...slug]` trước khi tạo — nếu trùng đường dẫn, đổi sang `/api/search-site` hoặc đặt ngoài group.

## 2. Route

`GET /api/site-search?q=...&locale=vi`

- Dùng Local API (`getPayload`), **không** gọi lại REST qua HTTP.
- Chạy 3 collection × 2 locale bằng `Promise.all` trong cùng một tiến trình → 1 round-trip mạng từ browser.
- `limit: 5`, `depth: 0` mỗi nhánh, giữ y như `buildQuery` hiện tại.
- Chỉ `select` field thật sự dùng: `id`, `title`, `slug`.
- Trả về đúng shape client đang cần, gộp sẵn theo group để client khỏi xử lý merge:

```ts
{ posts: ApiDoc[], jobs: ApiDoc[], categories: ApiDoc[] }
```

- Logic merge theo id + ưu tiên locale hiện tại (đang nằm trong `searchCollection`) chuyển hết về server.
- `overrideAccess: false` để tôn trọng access control của collection — search là endpoint công khai.
- Chặn input rỗng và giới hạn độ dài `q` (đề xuất ≤ 100 ký tự) để tránh regex tốn kém.

## 3. Ghi chú

Vẫn dùng toán tử `like` (Mongo `$regex`), không dùng index — đã chốt không bật `searchPlugin` trong task này. Lợi ích của phase là **6 → 1 round-trip**, không phải tăng tốc bản thân query. Nếu sau này search vẫn chậm khi dữ liệu lớn, đó là lúc bật `searchPlugin` (ghi lại ở plan §6 Out of scope).

## 4. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] Mở SearchModal, gõ 1 từ khóa → DevTools Network chỉ thấy **1** request.
- [ ] Kết quả trả về giống hệt trước khi sửa: so sánh cùng 1 từ khóa, cả 3 nhóm posts/jobs/categories.
- [ ] Gõ từ khóa tiếng Việt có dấu → vẫn ra kết quả (không bị mất khi encode query).
- [ ] Gõ từ khóa chỉ tồn tại ở bản EN, đang ở locale VI → vẫn tìm thấy (giữ hành vi tìm chéo locale).
- [ ] Gõ nhanh liên tiếp → request cũ bị abort, không có race hiển thị kết quả cũ đè kết quả mới.
- [ ] `q` rỗng → không gửi request.

## 5. Out of scope

- Không bật `@payloadcms/plugin-search`.
- Không đổi UI/UX của modal.
- Không thêm cache cho search (kết quả phụ thuộc query người dùng, cache ít giá trị).

## 6. Commit message dự kiến

```
perf(search): collapse the search modal's six requests into one

SearchModal fanned out one REST call per collection per locale — six
round-trips on every debounced keystroke — and merged the results in the
browser. A new /api/site-search route runs the same queries through the
Local API in a single process and returns them pre-grouped.

The `like` operator is unchanged, so this trades request count, not query
cost; switching to plugin-search stays available if the collections grow.
```
