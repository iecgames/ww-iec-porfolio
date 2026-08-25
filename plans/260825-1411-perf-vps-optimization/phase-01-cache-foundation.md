# Phase 01 — Nền cache dùng chung + gộp query `social`

**Goal:** Có một helper cache dùng chung cho các query collection lặp lại, và `social` — collection bị query trùng ở 2 nơi — chỉ còn đúng 1 lần gọi Mongo được cache theo tag. Đây cũng là phase kiểm chứng xem `revalidateTag(tag, 'max')` có thực sự invalidate `unstable_cache` hay không, trước khi nhân pattern ra 6 block còn lại ở phase 02.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/utilities/getSocials.ts` | CREATE |
| `src/collections/Social.ts` | MODIFY — thêm `hooks.afterChange` + `hooks.afterDelete` |
| `src/collections/Social/hooks/revalidateSocial.ts` | CREATE |
| `src/Footer/Component.tsx` | MODIFY — bỏ `getPayload` + `payload.find`, dùng helper |
| `src/blocks/SendUsCV/Component.tsx` | MODIFY — bỏ `getPayload` + `payload.find`, dùng helper |

> Lưu ý: `src/collections/Social.ts` hiện là file phẳng, không phải thư mục. Hook đặt ở `src/collections/Social/hooks/` sẽ lệch convention. **Quyết định: giữ `Social.ts` phẳng, đặt hook tại `src/collections/Social/hooks/revalidateSocial.ts`** — trùng với cách `Jobs`, `Posts`, `Pages` tổ chức, và không cần đổi import path của `Social.ts` trong `payload.config.ts`.

## 2. `src/utilities/getSocials.ts` (CREATE)

```ts
import type { Social } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

async function getSocials(): Promise<Social[]> {
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'social',
    limit: 20,
    depth: 0,
    sort: 'order',
  })

  return docs as Social[]
}

/**
 * Site-wide social links. Queried by both the Footer and the SendUsCV block,
 * so it is cached under a single tag to collapse the duplicate round-trip.
 * Invalidated by revalidateSocial on any create/update/delete.
 */
export const getCachedSocials = () =>
  unstable_cache(async () => getSocials(), ['social'], {
    tags: ['social'],
  })
```

## 3. `src/collections/Social/hooks/revalidateSocial.ts` (CREATE)

Bám đúng shape của `src/collections/Posts/hooks/revalidatePost.ts` (dùng `context.disableRevalidate` để không bắn khi seed).

```ts
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

export const revalidateSocial: CollectionAfterChangeHook = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating social links`)
    revalidateTag('social')
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating social links after delete`)
    revalidateTag('social')
  }

  return doc
}
```

> Dùng `revalidateTag('social', 'max')` — 2 tham số, giống các hook sẵn có. Xem §5 để biết vì sao đây là dạng bắt buộc.

## 4. `src/collections/Social.ts` (MODIFY)

Thêm import và khối `hooks` vào object config, ngay sau `access`:

```ts
import { revalidateDelete, revalidateSocial } from './Social/hooks/revalidateSocial'
```

```ts
  hooks: {
    afterChange: [revalidateSocial],
    afterDelete: [revalidateDelete],
  },
```

## 5. Kiểm chứng `revalidateTag` — ĐÃ CHỐT

Câu hỏi ban đầu: repo dùng dạng 2 tham số `revalidateTag('global_footer', 'max')`, chưa rõ có đúng không.

**Kết luận: dạng 2 tham số là bắt buộc trong Next 16.** Signature thực tế tại `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts:9`:

```ts
export declare function revalidateTag(tag: string, profile: string | CacheLifeConfig): undefined
```

Gọi 1 tham số là lỗi biên dịch (`TS2554: Expected 2 arguments, but got 1`) — phát hiện khi `tsc` chạy trên bản nháp đầu của hook này. `'max'` là profile cacheLife hợp lệ.

Hệ quả:
- Code mới dùng `revalidateTag(tag, 'max')`, thống nhất với các hook sẵn có (§3 đã sửa theo).
- Các hook cũ **không cần đụng tới** — mục kiểm tra điều kiện ở phase 07 §3 vì vậy không còn cần thiết.

## 6. Wiring notes

- Footer và SendUsCV **không được** import `getPayload` nữa cho mục đích lấy social. Footer vẫn cần bỏ `getPayload` khỏi mảng `Promise.all` ở dòng 74 — sau khi bỏ, mảng chỉ còn 2 phần tử `footerData` và `generalData`, và `getCachedSocials()()` gọi song song cùng chúng.
- Kiểu trả về giữ nguyên `Social[]` để không phải sửa JSX phía dưới của cả hai file.
- `SendUsCV` map sang `SocialItem` — giữ nguyên đoạn map đó, chỉ đổi nguồn `socialDocs`.

## 7. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` chạy xong không lỗi.
- [ ] `grep -rn "collection: 'social'" src/` chỉ còn đúng 1 kết quả, nằm trong `src/utilities/getSocials.ts`.
- [ ] Chạy `pnpm dev`, mở `/vi/career/<jobId>` (trang render **cả** Footer và SendUsCV) — footer và block CV đều hiện đủ social icon như trước.
- [ ] Bật log query của Payload, reload trang lần 2 → không thấy query `social` nào (cache hit).
- [ ] Kịch bản §5 chạy xong, kết luận về `revalidateTag` được ghi lại.
- [ ] Xóa 1 social trong admin → reload → icon biến mất (afterDelete hoạt động).

## 8. Out of scope (phase này)

- Không đụng 6 block component còn lại — để phase 02.
- Không sửa các hook `revalidate*` đang có sẵn sang dạng 1 tham số, kể cả khi §5 kết luận dạng 2 tham số sai. Đó là thay đổi lan rộng, xử lý riêng ở phase 07.
- Không cache `getTranslations` / next-intl messages.

## 9. Commit message dự kiến

```
perf(social): cache site-wide social links behind a single tag

Footer and the SendUsCV block each ran an identical `social` query on
every render, so any page showing both hit Mongo twice for the same
rows. Both now read through getCachedSocials() in src/utilities, backed
by unstable_cache under the `social` tag and invalidated by the new
revalidateSocial hooks on Social.

Follows the existing getGlobals/getRedirects convention: cached readers
live in src/utilities as getCachedXxx(), invalidation hooks live next to
the collection that owns the data.
```
