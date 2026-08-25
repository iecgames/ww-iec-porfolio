# Phase 06 — Bật lại Next image optimizer + cache ảnh cho Docker

**Goal:** Ảnh trả về client được resize và convert WebP/AVIF theo kích thước thật của viewport, thay vì gửi file gốc. Cache ảnh đã optimize sống sót qua các lần restart/deploy container.

## 1. Files chạm vào

| File | Action |
|---|---|
| `next.config.ts` | MODIFY — bỏ `unoptimized: true`, thêm `minimumCacheTTL` |
| `docker-compose.yml` | MODIFY — thêm volume cho `.next/cache/images` |
| `Dockerfile` | MODIFY (nếu cần) — đảm bảo `sharp` resolve được ở stage `runner` |
| `src/components/Media/ImageMedia/index.tsx` | MODIFY (có thể) — bỏ comment lỗi thời |

## 2. `next.config.ts`

Bỏ `unoptimized: true` (dòng 26). Các thứ khác **đã sẵn sàng**, không cần đổi:

- `remotePatterns` đã có `storage.googleapis.com` — đúng host mà `disablePayloadAccessControl: true` sinh ra
- `localPatterns` đã có `/api/media/file/**`, `/mascot/**`, `/page_404/**`
- `qualities: [80]` khớp với `quality={80}` trong `ImageMedia` (Next 16 bắt buộc allowlist)

Thêm `minimumCacheTTL` (đề xuất 2592000 = 30 ngày) để giảm số lần transform lại. An toàn vì `getMediaUrl` đã gắn `?<updatedAt>` làm cache-buster — ảnh đổi thì URL đổi.

Cập nhật comment ở khối `images` — comment hiện tại nói "Serve ảnh trực tiếp từ origin, không qua Next image optimizer", sẽ sai sau phase này.

## 3. Docker — hai việc bắt buộc

**a) Volume cache ảnh.** Không có nó thì mỗi lần `docker compose up -d --build` là cache rỗng, ảnh đầu tiên của mọi kích thước phải tải từ GCS + transform lại → khách đầu tiên sau deploy chịu toàn bộ độ trễ.

```yaml
volumes:
  - media_data:/app/public/media
  - image_cache:/app/.next/cache/images   # thêm
```

```yaml
volumes:
  media_data:
  image_cache:   # thêm
```

Thư mục phải thuộc user `nextjs` (uid 1001) — kiểm tra quyền ghi, nếu không thì thêm `mkdir -p` + `chown` vào Dockerfile giống cách `public/media` đang làm.

**b) `sharp` ở stage `runner`.** — ĐÃ KIỂM CHỨNG, VÀ ĐÚNG LÀ CÓ VẤN ĐỀ.

Kiểm tra `.next/standalone/node_modules` sau khi build:

```
.next/standalone/node_modules/sharp          ← CÓ (package JS)
.next/standalone/node_modules/@img           ← KHÔNG CÓ (binding native)
.next/standalone/node_modules/sharp/node_modules  ← rỗng
```

sharp 0.34 nạp binding native từ package rời `@img/sharp-<platform>` qua `require()` lúc chạy, và file-tracing của Next **không** kéo nó theo. Chỉ copy `node_modules/sharp` như dự tính ban đầu vẫn thiếu binding — mà với pnpm thì `@img` nằm trong `.pnpm`, symlink copy sang sẽ đứt.

Giải pháp đã áp dụng: cài lại sharp ngay trong stage `runner`, để npm tự lấy đúng bản musl của base image:

```dockerfile
RUN npm install --no-save --omit=dev sharp@0.34.2 \
    && chown -R nextjs:nodejs /app/node_modules/sharp /app/node_modules/@img
```

**c) Thiếu `ARG GCS_BUCKET` — bug có sẵn, sửa luôn.** `docker-compose.yml` truyền `GCS_BUCKET` làm build arg, nhưng Dockerfile không khai báo `ARG GCS_BUCKET` nên Docker bỏ qua. `storagePlugin()` ném lỗi khi thiếu biến này và nó chạy trong `next build` → build trong Docker sẽ fail. Đã thêm `ARG`/`ENV` tương ứng.

## 4. Đánh đổi đã chấp nhận

VPS phải tải ảnh từ GCS về, transform bằng sharp, ghi cache ra đĩa. Tốn CPU ở lần đầu mỗi (ảnh × kích thước), và tốn dung lượng đĩa. Đổi lại băng thông về client giảm mạnh và ảnh có WebP/AVIF. User đã chốt hướng này ở Q&A.

7 `imageSizes` trong `collections/Media.ts` **giữ nguyên** — vẫn dùng cho thumbnail admin và ảnh `og`.

## 5. Acceptance criteria

> ⚠ **Các mục Docker CHƯA chạy được.** Docker CLI có (v29.4.0) nhưng daemon không
> chạy trong phiên làm việc — `docker build` báo *cannot connect to the Docker API*.
> Phần `next.config.ts` đã verify bằng `pnpm build`; phần Dockerfile/compose mới chỉ
> được suy luận từ bằng chứng ở §3b. **Bạn cần chạy lại các mục dưới trên máy có Docker.**

- [x] `pnpm build` sạch.
- [ ] `docker compose build && docker compose up -d` → container khởi động, log không lỗi.
- [ ] Mở trang chủ → DevTools Network: ảnh đi qua `/_next/image?url=...&w=...&q=80`, **không** phải URL GCS trực tiếp.
- [ ] Response header ảnh có `content-type: image/webp` (hoặc avif).
- [ ] Dung lượng ảnh tải về nhỏ hơn rõ rệt so với trước (ghi lại con số trước/sau của trang chủ).
- [ ] Thẻ `<img>` có `srcset` nhiều kích thước; thu nhỏ cửa sổ → browser chọn ảnh nhỏ hơn.
- [ ] **Sharp:** không có lỗi liên quan sharp trong log container; ảnh hiện đủ, không vỡ.
- [ ] `docker compose restart` → ảnh vẫn phục vụ từ cache (nhanh), volume `image_cache` có dữ liệu: `docker compose exec app ls /app/.next/cache/images`.
- [ ] Ảnh local (`/mascot/**`, `/page_404/**`) vẫn hiển thị.
- [ ] Editor thay ảnh trong admin → reload → thấy ảnh mới (cache-buster `?updatedAt` hoạt động).

## 6. Out of scope

- Không đổi `imageSizes` của Media.
- Không thêm CDN/reverse-proxy cache trước Next.
- Không đụng `VideoMedia`.

## 7. Commit message dự kiến

```
perf(images): re-enable the Next image optimizer and persist its cache

Images were served with unoptimized: true while ImageMedia always pointed
at resource.url, so every viewport downloaded the original upload and the
`sizes` prop had no srcSet to pick from. Dropping unoptimized lets Next
resize and convert to WebP/AVIF; remotePatterns and the qualities
allowlist were already configured for it.

Adds an image_cache volume for .next/cache/images so optimized output
survives redeploys instead of being rebuilt on the first visitor after
every container restart.
```
