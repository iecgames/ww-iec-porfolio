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
| `src/collections/Games/index.ts` | MODIFY — gắn hook |
| `src/collections/Jobs/hooks/revalidateJob.ts` | MODIFY — thêm `revalidateTag('jobs', 'max')` |
| `src/collections/Posts/hooks/revalidatePost.ts` | MODIFY — thêm `revalidateTag('posts', 'max')` |
| ~~`src/collections/Categories/hooks/revalidateCategory.ts`~~ | **KHÔNG CẦN** — xem §1b |

### 1b. Sai lệch so với kế hoạch

**Không tạo hook cho `categories`.** Kế hoạch dự trù tag `categories`, nhưng khi viết xong thì không cache nào dùng tag đó: `CategoryShowcase` trả về **posts** lọc theo category, nên nó tag `posts`. Đổi tên một category không làm đổi tập post trả về. Tạo hook cho tag không ai đọc là code chết.

**Thêm `revalidatePost.ts` vào bảng.** Kế hoạch bỏ sót. Ba block (`ArchiveBlock`, `CategoryShowcase`, `IECLife`) đều tag `posts`, mà hook sẵn có chỉ bắn `posts-sitemap`. Không thêm thì sửa bài viết xong trang chủ vẫn hiện danh sách cũ.

`revalidateTag('posts', 'max')` được đặt **ngoài** nhánh `_status === 'published'`: một bài bị gỡ xuất bản cũng làm đổi danh sách, nên mọi thay đổi đều phải xóa cache.

## 2. Cache key — điểm dễ sai nhất của phase

`unstable_cache` chỉ phân biệt entry qua mảng `keyParts`. Mọi tham số ảnh hưởng kết quả query **phải** nằm trong keyParts, nếu không hai block cùng loại với `limit` khác nhau sẽ ăn nhầm cache của nhau.

Bắt buộc đưa vào keyParts của từng block: tên block, `limit`, và mọi filter đến từ props (vd `categories` của ArchiveBlock, `selectedDocs`). Ví dụ shape:

```ts
export const getCachedIECLifePosts = (limit: number) =>
  unstable_cache(
    async () => { /* payload.find(...) */ },
    ['iec-life', String(limit)],
    { tags: ['posts'] },
  )
```

Với `ArchiveBlock` — `categories` là mảng → serialize ổn định (`sort().join(',')`) trước khi đưa vào keyParts.

### 2b. Vì sao `locale` KHÔNG nằm trong cache key

Kế hoạch ban đầu định đưa `locale` vào keyParts. Khi đọc code thì thấy **không block nào truyền `locale` vào `payload.find()`** — kể cả với `posts`/`jobs` là collection có localization. Payload vì vậy luôn trả về locale mặc định của config, và `/en` với `/vi` hiện cùng một nội dung.

Cache key phải phản ánh đúng thứ làm kết quả query thay đổi. Vì query không phụ thuộc locale, thêm locale vào key chỉ tạo hai entry giống hệt nhau. Nên bỏ.

Đây là hành vi **có sẵn từ trước**, task này giữ nguyên chứ không sửa — đổi nó là thay đổi ngữ nghĩa, không phải tối ưu. Nhưng nó đáng là một task riêng: **các block đang hiển thị nội dung sai ngôn ngữ ở trang `/en`**. Nếu sau này sửa, phải thêm `locale` vào cả query lẫn keyParts cùng lúc.

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
