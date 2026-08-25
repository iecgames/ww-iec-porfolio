# Phase 02 — Cache query của toàn bộ block component

**Goal:** 6 block component còn lại không còn gọi `getPayload()` trực tiếp. Mỗi block có `query.ts` colocate, cache theo tag của collection nó đọc. Trang chủ ở trạng thái cache ấm không phát sinh query Mongo nào từ tầng block.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/blocks/ArchiveBlock/query.ts` | CREATE |
| `src/blocks/ArchiveBlock/Component.tsx` | MODIFY |
| `src/blocks/CareersHighlight/query.ts` | CREATE |
| `src/blocks/CareersHighlight/Component.tsx` | MODIFY |
| `src/blocks/CategoryShowcase/query.ts` | CREATE |
| `src/blocks/CategoryShowcase/Component.tsx` | MODIFY |
| `src/blocks/GamesPortfolio/query.ts` | CREATE |
| `src/blocks/GamesPortfolio/Component.tsx` | MODIFY |
| `src/blocks/IECLife/query.ts` | CREATE |
| `src/blocks/IECLife/Component.tsx` | MODIFY |
| `src/blocks/JobBoard/query.ts` | CREATE |
| `src/blocks/JobBoard/Component.tsx` | MODIFY |
| `src/collections/Games/hooks/revalidateGame.ts` | CREATE |
| `src/collections/Categories/hooks/revalidateCategory.ts` | CREATE |
| `src/collections/Games.ts` (hoặc thư mục tương ứng) | MODIFY — gắn hook |
| `src/collections/Categories.ts` (hoặc thư mục tương ứng) | MODIFY — gắn hook |
| `src/collections/Jobs/hooks/revalidateJob.ts` | MODIFY — thêm `revalidateTag('jobs')` |

> Đường dẫn chính xác của `Games`/`Categories` (file phẳng hay thư mục) phải xác nhận lại khi vào phase; bảng này cập nhật theo thực tế trước khi code.

## 2. Cache key — điểm dễ sai nhất của phase

`unstable_cache` chỉ phân biệt entry qua mảng `keyParts`. Mọi tham số ảnh hưởng kết quả query **phải** nằm trong keyParts, nếu không hai block cùng loại với `limit` khác nhau sẽ ăn nhầm cache của nhau.

Bắt buộc đưa vào keyParts của từng block: tên block, `locale`, `limit`, và mọi filter đến từ props (vd `categories` của ArchiveBlock, `selectedDocs`). Ví dụ shape:

```ts
export const getCachedIECLifePosts = (limit: number, locale: 'en' | 'vi') =>
  unstable_cache(
    async () => { /* payload.find(...) */ },
    ['iec-life', String(limit), locale],
    { tags: ['posts'] },
  )
```

Với `ArchiveBlock` — `categories` là mảng → serialize ổn định (`sort().join(',')`) trước khi đưa vào keyParts.

## 3. Ghi chú theo từng block

- **ArchiveBlock** — nhánh `populateBy === 'selection'` dùng `selectedDocs` đã populate sẵn từ props, **không** query; chỉ cache nhánh `collection`.
- **CareersHighlight** — 2 query (featured + recent), nhánh recent chỉ chạy khi featured thiếu. Giữ nguyên logic, cache cả hàm bao ngoài thay vì từng query.
- **GamesPortfolio** — hiện **không có `limit`**, fetch toàn bộ. Thêm `limit` hợp lý (đề xuất 100) cùng lúc, vì đây là query dễ phình nhất.
- **JobBoard** — `limit: 200`, tag `jobs`.
- **CategoryShowcase** — tag `categories` (và `posts` nếu query chạm posts — xác nhận khi đọc file).

## 4. Wiring notes

- Không block nào được import `@payload-config` / `getPayload` sau phase này.
- `query.ts` là server-only; không thêm `'use client'`.
- Hook invalidate mới bám shape của `revalidateSocial.ts` từ phase 01 (bao gồm `context.disableRevalidate`).
- `revalidateJob.ts` hiện chỉ gọi `revalidatePath`. Thêm `revalidateTag('jobs')`, **giữ nguyên** các `revalidatePath` đang có vì `/career/[jobId]` là route `force-static`.

## 5. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` chạy xong không lỗi.
- [ ] `grep -rn "getPayload" src/blocks/` → 0 kết quả.
- [ ] Trang chủ render đúng như trước (so sánh bằng mắt trước/sau trên `pnpm dev`).
- [ ] Reload trang chủ lần 2 → log Payload không có query nào từ block.
- [ ] Sửa 1 job trong admin → reload `/career` → thấy đổi.
- [ ] Sửa 1 post → reload trang chủ (nếu có ArchiveBlock/IECLife) → thấy đổi.
- [ ] Hai block cùng loại, khác `limit`, đặt trên cùng 1 trang → trả về số lượng khác nhau đúng như cấu hình (test cache key không đụng nhau).

## 6. Out of scope

- Không đổi giao diện/markup của block.
- Không gộp các block query giống nhau thành một helper chung — cache key khác nhau, gộp sẽ rối hơn.
- Không đụng `RelatedPosts` (nhận `docs` từ props, không tự query).

## 7. Commit message dự kiến

```
perf(blocks): move block data fetching behind tagged caches

Every block component opened its own Payload client and queried Mongo on
each render, so a homepage with six blocks cost six sequential
round-trips per view. Each block now reads through a colocated query.ts
wrapped in unstable_cache, tagged by the collection it reads.

Adds revalidate hooks for games and categories, and a jobs tag to the
existing revalidateJob, so editor changes still surface immediately.
Cache keys include locale and every prop that shapes the query.
```
