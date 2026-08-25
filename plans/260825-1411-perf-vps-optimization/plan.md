# Tối ưu hiệu năng runtime cho bản deploy VPS

**Date:** 2026-08-25 14:11 (Asia/Ho_Chi_Minh)
**Scope:** `src/blocks/`, `src/utilities/`, `src/components/`, `src/app/(frontend)/`, `src/collections/`, `src/Footer/`, `next.config.ts`, `Dockerfile`, `docker-compose.yml`, `package.json`
**Trigger:** Site chậm rõ rệt khi rời VPS. Rà soát repo cho thấy nguyên nhân không nằm ở hạ tầng mà ở tầng data-access: mọi block component query thẳng Mongo không cache, AdminBar gọi API cho từng khách vãng lai, ảnh gửi bản gốc full-size. Sau khi xong, một lượt xem trang ở trạng thái cache ấm phải là **0 query Mongo**.

## 1. Goal

Giảm số round-trip Mongo trên mỗi lượt xem trang từ ~10–15 xuống 0 (cache ấm), và giảm dung lượng ảnh truyền về client. Không thêm endpoint công khai nào ngoài `/api/site-search`. Không đổi schema, không migration. Luồng draft/live-preview giữ nguyên hành vi hiện tại. Sau khi hoàn tất, `pnpm build` vẫn chạy được và `docker compose up` khởi động sạch.

## 2. Kiểm chứng data-model (Phase A1)

| Thực thể | Một row/doc được tạo khi | Một row/doc mang nghĩa |
|---|---|---|
| `home`, `career` (global) | Editor lưu global; bật `versions.drafts` | Bản published **hoặc** bản nháp — `draft: true` trả về nội dung chưa duyệt |
| `pages`, `posts` | Editor tạo doc; bật `versions.drafts` | Cùng ý trên; `_status` phân biệt |
| `social` | Editor thêm 1 link mạng xã hội | 1 icon trên footer/CV block — dữ liệu toàn site, không theo trang |
| `jobs` | Editor đăng 1 vị trí tuyển dụng | 1 job, hiển thị ở `/career` và `/career/[jobId]` |
| `redirects` | Plugin redirects tạo khi editor cấu hình | 1 luật redirect toàn site |

**Hệ quả cho thiết kế:** `social`, `redirects`, và các global là **dữ liệu toàn site, đổi rất hiếm** → cache theo tag là đúng ngữ nghĩa, không có rủi ro lệch dữ liệu theo người dùng. Ngược lại, mọi query có `draft: true` **không được cache** vì nội dung nháp là riêng của editor đang xem. Đây là ràng buộc xuyên suốt mọi phase.

## 3. Quyết định đã chốt (từ Q&A vòng 1)

| Câu hỏi | Lựa chọn |
|---|---|
| Trang chủ / `/career` / `/[slug]` đang SSR mỗi request | **Giữ route dynamic, cache tầng query theo tag.** Không đụng luồng draft/live-preview |
| AdminBar gọi `/api/users/me` cho mọi khách | **Gate bằng cookie `payload-token`** đọc phía server. Admin duyệt site vẫn thấy bar |
| SearchModal bắn 6 request/keystroke | **Gộp thành 1 route `/api/site-search`**, chạy 3 collection × 2 locale song song bằng Local API |
| Ảnh gửi bản gốc full-size | **Bật lại Next image optimizer** (bỏ `unoptimized: true`), kèm volume cache ảnh trong Docker |
| Thư viện cache | Giữ `unstable_cache` cho đồng bộ với `getGlobals.ts` / `getRedirects.ts` hiện có. Không migrate sang `'use cache'` trong task này |
| `output: 'standalone'` | **Giữ nguyên** — deploy VPS qua Docker |

## 4. Quy ước đặt tên & ranh giới module (Phase A2 + A3)

Repo đã có convention rõ, task này bám theo, không phát minh cái mới:

- **Helper đọc dữ liệu dùng chung nhiều nơi** (globals, socials, redirects) → `src/utilities/getXxx.ts`, export `getCachedXxx()` trả về hàm `unstable_cache`. Theo đúng `getGlobals.ts`, `getRedirects.ts`, `getDocument.ts`.
- **Query riêng của một block** (chỉ block đó dùng, cache key phụ thuộc props của block) → colocate tại `src/blocks/<Block>/query.ts`, export `getCached<Block>Data(...)`. Không nhét vào `src/utilities/` để tránh biến thư mục đó thành bãi chứa hàm dùng-một-lần.
- **Hook invalidate** → nằm cạnh chủ thể sở hữu dữ liệu: `src/collections/<Name>/hooks/revalidate<Name>.ts` cho collection, `src/<GlobalName>/hooks/revalidate<GlobalName>.ts` cho global.
- **Tag cache** → global dùng `global_<slug>` (đã có), collection dùng `<slug>` số nhiều đúng tên collection (vd `social`, `jobs`, `games`).
- Block component **không** tự gọi `getPayload()` nữa; chỉ import từ `src/utilities/` hoặc từ `query.ts` cạnh nó. Đây là ranh giới chính mà task này thiết lập.

## 5. Phase breakdown

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | `phase-01-cache-foundation.md` | Dựng helper cache dùng chung + gộp query `social` trùng lặp + hook invalidate cho `social` | — |
| 02 | `phase-02-block-queries.md` | Bọc cache toàn bộ 7 block component; thêm hook invalidate cho `jobs`/`games`/`categories` | 01 |
| 03 | `phase-03-page-queries.md` | Cache query cấp trang (home/career/[slug]/posts) theo nhánh non-draft; xóa code debug `fs.appendFileSync` | 01 |
| 04 | `phase-04-adminbar-gate.md` | Gate AdminBar bằng cookie `payload-token` | — |
| 05 | `phase-05-search-route.md` | Gộp 6 request search thành 1 route `/api/site-search` | — |
| 06 | `phase-06-image-optimizer.md` | Bật lại Next image optimizer + volume cache ảnh cho Docker | — |
| 07 | `phase-07-cleanup.md` | Gỡ dependency chết, regenerate importMap | 01–06 |

DAG: 01 chặn 02 và 03 (cả hai dùng helper từ 01). 04, 05, 06 độc lập hoàn toàn. 07 chạy cuối.

## 6. Phạm vi

**In scope**
- 7 block component trong `src/blocks/*/Component.tsx`
- `src/Footer/Component.tsx`
- 4 page component: `[locale]/page.tsx`, `[locale]/career/page.tsx`, `[locale]/[slug]/page.tsx`, `[locale]/posts/[slug]/page.tsx`
- `src/components/AdminBar/index.tsx` + `[locale]/layout.tsx`
- `src/components/SearchModal/index.tsx` + route mới `/api/site-search`
- `next.config.ts` (chỉ khối `images`), `Dockerfile`, `docker-compose.yml`
- Helper mới trong `src/utilities/`, hook invalidate mới trong `src/collections/*/hooks/`
- `package.json` (chỉ gỡ dep chết)

**Out of scope** — cố tình không làm, dù có thể hấp dẫn:
- Không migrate `unstable_cache` → `'use cache'` (Next 16 khuyến nghị nhưng là refactor riêng, rủi ro chéo)
- Không bật `@payloadcms/plugin-search` (đã chốt phương án route gộp)
- Không đụng `payload.config.ts`, không đổi schema/collection field
- Không sửa `mongooseAdapter` connection pool — trên VPS mặc định đã đủ
- Không đụng `src/mcp/`, `src/oauth/`, `src/endpoints/` — không nằm trên đường render trang public
- Không sửa `src/app/(payload)/` (admin panel)
- Không tối ưu bundle client (framer-motion, heroui) — cần đo trước, để task sau
- Không viết test mới; repo chưa có test cho các file này

## 7. Rủi ro

- **Cache stale khi editor sửa nội dung.** Giảm thiểu: mỗi tag mới đều đi kèm hook `afterChange`/`afterDelete` trong cùng phase. Acceptance criteria của phase 01/02 bắt buộc test tay: sửa doc trong admin → reload trang → thấy đổi.
- **`revalidateTag(tag, 'max')` với 2 tham số.** Code hiện tại dùng dạng 2 tham số của Next 16, vốn dành cho `'use cache'`. Chưa rõ có invalidate `unstable_cache` không. Giảm thiểu: phase 01 kiểm chứng bằng test tay trước khi nhân rộng pattern; nếu không ăn thì đổi hết về `revalidateTag(tag)` 1 tham số.
- **Nội dung draft bị cache nhầm → editor thấy bản cũ khi preview.** Giảm thiểu: nhánh `draft === true` luôn bypass cache, không ngoại lệ. Là acceptance criterion riêng ở phase 03.
- **`sharp` không resolve được trong Docker runner stage.** Stage `runner` chỉ copy `.next/standalone`; sharp được kéo vào nhờ file-tracing (do `payload.config.ts` import trực tiếp). Nếu optimizer báo lỗi runtime thì phải copy `node_modules/sharp` thủ công. Acceptance criterion của phase 06 kiểm tra đúng điểm này.
- **Cache ảnh phình đĩa VPS.** Volume `image_cache` không giới hạn dung lượng. Chấp nhận được — đặt `minimumCacheTTL` và theo dõi; ảnh optimize nhỏ hơn bản gốc nhiều.
- **Gỡ nhầm dependency đang dùng ngầm.** `graphql` không xuất hiện trong `src/` nhưng là peer dep của Payload GraphQL route. Giảm thiểu: phase 07 chỉ gỡ `@aws-sdk/client-s3` và `@payloadcms/plugin-search`, giữ `graphql`; verify bằng `pnpm build` sạch.
