# Phase 02 — Link nội bộ giữ đúng ngôn ngữ

**Goal:** Bấm link nội bộ khi đang ở `/vi` thì ở lại `/vi`. Không còn vòng redirect thừa qua proxy, không còn rơi về `en`.

## 1. Files chạm vào

Mọi file import `next/link` cho điều hướng nội bộ — 17 file (bỏ 2 file chết):

| Nhó| File |
|---|---|
| Link dùng chung | `components/Link/index.tsx`, `components/RippleLink/index.tsx` |
| Header / Footer | `Header/Component.client.tsx`, `Footer/Component.tsx` |
| Hero | `heros/BrandHero/index.tsx`, `heros/VideoHero/index.tsx` |
| Block | `blocks/AboutWithStats/Component.tsx`, `blocks/CareersHighlight/CareersHighlightView.tsx`, `blocks/CategoryShowcase/CategoryShowcaseView.tsx`, `blocks/CoreValuesShowcase/Component.tsx`, `blocks/IECLife/IECLifeView.tsx`, `blocks/RelatedPosts/Component.tsx` |
| Component | `components/Card/index.tsx`, `components/JobCard/index.tsx` |
| Trang | `[locale]/career/[jobId]/page.tsx`, `[locale]/not-found.tsx`, `[locale]/posts/category/[slug]/CategoryArchiveView.tsx`, `[locale]/posts/FeaturedPost.tsx`, `[locale]/unsubscribe/page.tsx` |

**Đính chính khi thực thi:** plan ghi loại trừ `components/ui/pagination.tsx` và `components/Pagination/index.tsx`, nhưng kiểm lại thì **hai file đó không hề import `next/link`** — chúng dựng nút phân trang bằng markup riêng. Không có gì để loại trừ; đủ **18 file** đều đổi (19 chỗ dùng `next/link`, trừ `CMSLink` đã xử lý ở phase 01).

## 2. Thay đổi

```diff
- import Link from 'next/link'
+ import { Link } from '@/i18n/navigation'
```

Chỉ đổi import. Không đổi prop, không rẽ nhánh thủ công theo loại href — `isLocalizableHref` của next-intl đã lo (xem plan §2).

Lưu ý cú pháp: `next/link` export **default**, `@/i18n/navigation` export **named**. Đổi sai sẽ lỗi biên dịch ngay, không im lặng.

## 3. Vì sao không cần xử lý href ngoài

Đã kiểm chứng ở plan §2: next-intl chỉ gắn tiền tố cho href bắt đầu bằng `/` và không có protocol. `https:`, `mailto:`, `tel:`, `#anchor` đều đi qua nguyên vẹn.

Các chỗ thực tế đang dùng href ngoài — `linkedinUrl` (JobCard, trang job), `mailto:`/`tel:` (Footer, JobApplyModal), `playUrl`/`appStoreUrl` (Games) — vì vậy không đổi hành vi.

## 4. Acceptance criteria — ĐÃ CHẠY

- [x] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [x] `grep -rn "from 'next/link'" src/` → **0 kết quả**.
- [x] **Ca chính:** đếm href nội bộ thiếu tiền tố locale trên 6 trang — tất cả bằng 0:

  ```
  /vi          0        /en          0
  /vi/career   0        /en/career   0
  /vi/posts    0        /en/posts    0
  ```

- [x] `/en` render `/en`, `/en/career`, `/en/posts` — đúng locale.
- [x] **Href ngoài không bị đụng:** `/en` vẫn giữ nguyên `mailto:nghiadt@ieccorp.vn` và `https://storage.googleapis.com/…`.
- [x] Không còn vòng redirect: `GET /vi/posts → 200, num_redirects=0`.
- [x] Server Component build được — 18 file, phần lớn là server component.

Chưa kiểm được (DB rỗng, không có nội dung để dựng): anchor `#…` trong trang thật, và nav do CMS cấu hình. Cơ chế đã chứng minh ở plan §2 (`isRelativeHref` chặn href không bắt đầu bằng `/`).

## 5. Out of scope

- Không đổi `defaultLocale`.
- Không đụng link trong email (`sendCampaign`) — chúng là URL tuyệt đối, xử lý riêng nếu cần.

## 6. Commit message dự kiến

```
fix(i18n): keep internal links on the active locale

Every internal link went through next/link with an unprefixed href, so a
visitor reading /vi who clicked the nav was bounced by the proxy to
/en — losing their language and paying a redirect on the way. Only the
search modal used the locale-aware Link.

All seventeen live call sites now import Link from @/i18n/navigation.
next-intl prefixes only hrefs that start with "/" and carry no protocol,
so external URLs, mailto:, tel: and #anchor links pass through untouched
and need no branching at the call site.

Leaves the two dead pagination components alone.
```
