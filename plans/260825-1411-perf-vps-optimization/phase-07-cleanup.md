# Phase 07 — Dọn dependency chết và importMap cũ

**Goal:** `package.json` không còn dependency không ai dùng; `importMap.js` không còn trỏ tới plugin đã gỡ.

## 1. Files chạm vào

| File | Action |
|---|---|
| `package.json` | MODIFY — gỡ `@aws-sdk/client-s3`, `@payloadcms/plugin-search` |
| `pnpm-lock.yaml` | REGENERATE |
| `src/app/(payload)/admin/importMap.js` | REGENERATE |

## 2. Căn cứ

- **`@aws-sdk/client-s3`** (devDependency): `grep -rn "aws-sdk" src/ scripts/` → 0 kết quả. Dự án đã chuyển sang GCS (`@payloadcms/storage-gcs`). Tàn dư của lần migrate trước.
- **`@payloadcms/plugin-search`**: không được đăng ký trong `src/plugins/index.ts`, chỉ còn xuất hiện ở `importMap.js:25-26` — dấu vết của lần bật rồi gỡ. Đã chốt không bật lại trong task này (plan §6).
- **`graphql`**: `grep` cũng không ra kết quả trong `src/`, **nhưng KHÔNG gỡ** — nó là peer dependency của Payload cho route `/api/graphql`. Gỡ sẽ làm gãy runtime mà `tsc` không phát hiện.

## 3. ~~Kiểm tra `revalidateTag`~~ — KHÔNG CÒN CẦN

Phase 01 §5 đã chốt: dạng 2 tham số `revalidateTag(tag, 'max')` là **bắt buộc** theo signature của Next 16, gọi 1 tham số không biên dịch được. Các hook sẵn có đang dùng đúng, không hook nào cần sửa.

## 4. Acceptance criteria

- [ ] `pnpm install` chạy xong, lockfile cập nhật.
- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` sạch.
- [ ] `pnpm dev` → admin vào được, không lỗi importMap trong console.
- [ ] `/api/graphql` vẫn trả lời (xác nhận việc giữ `graphql` là đúng).
- [ ] Upload 1 ảnh trong admin → lên GCS bình thường (xác nhận gỡ aws-sdk không ảnh hưởng).
- [ ] Nếu có sửa `revalidateTag`: sửa 1 global bất kỳ → reload trang → thấy đổi.

## 5. Out of scope

- Không gỡ `graphql`.
- Không audit dependency client-side (framer-motion, heroui…) — cần đo bundle trước, để task riêng.
- Không nâng version dependency nào.

## 6. Commit message dự kiến

```
chore(deps): drop unused aws-sdk and plugin-search

@aws-sdk/client-s3 is a leftover from the pre-GCS storage setup and is
imported nowhere. @payloadcms/plugin-search was removed from the plugin
list but still lingered in package.json and the generated importMap.

graphql stays despite having no direct import — Payload needs it for the
/api/graphql route.
```
