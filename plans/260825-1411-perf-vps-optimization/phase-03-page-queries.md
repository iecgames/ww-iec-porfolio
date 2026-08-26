# Phase 03 — Cache query cấp trang + xóa code debug

**Goal:** Trang chủ, `/career`, `/[slug]`, `/posts/[slug]` không còn chạm Mongo khi phục vụ khách ẩn danh ở cache ấm. Nhánh draft vẫn đi thẳng vào DB, không bao giờ được cache. Code debug ghi file trong trang chủ bị gỡ.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/app/(frontend)/[locale]/page.tsx` | MODIFY — cache nhánh non-draft, xóa `try/catch` + `fs.appendFileSync` |
| `src/app/(frontend)/[locale]/career/page.tsx` | MODIFY — cache nhánh non-draft |
| `src/app/(frontend)/[locale]/[slug]/page.tsx` | MODIFY — cache nhánh non-draft |
| `src/app/(frontend)/[locale]/posts/[slug]/page.tsx` | MODIFY — cache nhánh non-draft |

## 2. Pattern bắt buộc — draft luôn bypass cache

Mọi trang áp dụng đúng hình dạng này. `cache()` của React giữ nguyên để dedupe giữa `generateMetadata` và component trong cùng một request; `unstable_cache` là lớp thứ hai, chỉ cho nhánh non-draft:

```ts
// Bản không cache — dùng cho draft
const queryHomeUncached = async (locale: 'en' | 'vi', draft: boolean) => {
  const payload = await getPayload({ config: configPromise })
  return (await payload.findGlobal({
    slug: 'home', depth: 2, draft, overrideAccess: draft, locale,
  })) || null
}

// Bản có cache — chỉ dùng khi draft === false
const queryHomeCached = (locale: 'en' | 'vi') =>
  unstable_cache(
    async () => queryHomeUncached(locale, false),
    ['home-page', locale],
    { tags: ['global_home'] },
  )

const queryHomeGlobal = cache(async (locale: 'en' | 'vi', draft: boolean) =>
  draft ? queryHomeUncached(locale, true) : queryHomeCached(locale)(),
)
```

Tag dùng lại tag mà hook sẵn có đang bắn: `global_home` (`src/Home/hooks/revalidateHome.ts`), `global_career` (`src/Career/hooks/revalidateCareer.ts`). Với `pages`/`posts`, hook hiện dùng `revalidatePath` — phase này thêm tag `pages` / `posts` vào cache và bổ sung `revalidateTag` tương ứng vào hook nếu chưa có.

## 3. Xóa code debug — `[locale]/page.tsx:27-31`

```ts
// XÓA nguyên khối này, gọi thẳng queryHomeGlobal
let home
try {
  home = await queryHomeGlobal(locale, draft)
} catch (e) {
  const fs = await import('fs')
  fs.appendFileSync('debug-error.log', `\n===== queryHomeGlobal =====\n${(e as Error).stack}\n`)
  throw e
}
```

Trên container chạy user `nextjs` không có quyền ghi `/app`, `appendFileSync` sẽ ném lỗi mới đè lên lỗi gốc và giấu mất nguyên nhân thật.

## 4. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] `grep -rn "debug-error.log" src/` → 0 kết quả.
- [ ] Khách ẩn danh reload trang chủ lần 2 → 0 query Mongo trong log.
- [ ] **Draft không bị cache:** đăng nhập admin → sửa nội dung trang chủ, KHÔNG publish → bấm Preview → thấy nội dung nháp. Reload preview vài lần → vẫn thấy bản nháp mới nhất, không phải bản published.
- [ ] Khách ẩn danh mở trang chủ ở tab ẩn danh → thấy bản **published**, không rò rỉ nội dung nháp.
- [ ] Publish thay đổi → reload trang khách → thấy nội dung mới (hook invalidate chạy).
- [ ] Live preview (`LivePreviewListener`) vẫn cập nhật realtime như trước.
- [ ] `/posts/<slug>` và `/<slug>` hoạt động đúng cho cả 2 locale.

## 5. Out of scope

- Không chuyển các route này sang `force-static`. Đã chốt ở plan §3.
- Không đụng `PayloadRedirects` (đã cache sẵn qua `getCachedRedirects`).
- Không sửa `generateStaticParams` — vấn đề build ra 0 trang tĩnh là chuyện của môi trường build (`DATABASE_URL`), sẽ báo riêng cho user, không sửa bằng code.

## 6. Commit message dự kiến

```
perf(pages): cache published page queries, keep drafts uncached

Home, career, [slug] and posts/[slug] hit Mongo on every request because
draftMode() opts them out of static rendering. The published branch now
reads through unstable_cache tagged with the same tags the existing
revalidate hooks already fire; the draft branch still goes straight to
the database so editors never see a stale preview.

Also removes a leftover debug handler in the home page that wrote to
debug-error.log — on a read-only container filesystem it threw over the
original error and hid the real cause.
```
