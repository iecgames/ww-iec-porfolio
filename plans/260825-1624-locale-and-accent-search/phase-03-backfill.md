# Phase 03 — Backfill `searchText` cho dữ liệu cũ

**Goal:** Mọi doc đã tồn tại trong `posts`, `jobs`, `categories` đều có `searchText` ở cả hai locale, nên tìm không dấu ra được ngay chứ không phải đợi editor lưu lại từng doc.

## 1. Files chạm vào

| File | Action |
|---|---|
| `scripts/backfill-search-text.ts` | CREATE |
| `package.json` | MODIFY — thêm script `backfill:search` |

## 2. Cách làm

Với mỗi collection trong `['posts', 'jobs', 'categories']`, với mỗi locale trong `['en', 'vi']`:

1. `payload.find({ collection, locale, pagination: false, depth: 0, overrideAccess: true })`
2. Tính `searchText` bằng đúng helper mà hook dùng — **không viết lại logic fold**, import chung, nếu không hai đường sẽ trôi khác nhau.
3. `payload.update({ collection, id, locale, data: { searchText }, context: { disableRevalidate: true } })`

`disableRevalidate` để không bắn hàng loạt `revalidateTag` khi chạy qua vài trăm doc.

## 3. Lưới an toàn

- **Dry-run mặc định**, `--confirm` mới ghi. Giống script purge trước đó.
- In ra mỗi doc: id, title, `searchText` sẽ ghi — để soi bằng mắt trước khi chạy thật.
- Chỉ ghi đúng field `searchText`. Không đụng field nào khác.
- Script chạy lại được nhiều lần (idempotent) — tính lại rồi ghi đè cùng giá trị.

## 4. Acceptance criteria

- [ ] Dry-run in đúng số doc mỗi collection × locale, kèm `searchText` dự kiến.
- [ ] Chạy `--confirm` xong không lỗi.
- [ ] REST `?depth=0&locale=vi` cho 1 job → thấy `searchText` đã điền.
- [ ] Cùng job đó ở `locale=en` → `searchText` là bản tiếng Anh, khác bản vi (với doc đã dịch).
- [ ] `GET /api/site-search?q=hoa si` ra kết quả **mà không cần lưu lại doc nào trong admin**.
- [ ] Chạy script lần hai → không lỗi, kết quả không đổi.
- [ ] Kiểm tra 1 post bất kỳ: `title` và các field khác không bị thay đổi.

## 5. Out of scope

- Không backfill `games`.
- Không xóa script sau khi chạy — nó idempotent và còn dùng lại được khi đổi danh sách field nguồn.

## 6. Commit message dự kiến

```
chore(search): backfill searchText for existing documents

The syncSearchText hook only fires on save, so documents written before
it existed had no folded text and stayed invisible to accent-insensitive
search until someone re-saved them. This script computes the field for
every post, job and category in both locales.

Shares the fold helper with the hook rather than reimplementing it, so
the two cannot drift. Dry-run by default; --confirm writes. Idempotent.
```
