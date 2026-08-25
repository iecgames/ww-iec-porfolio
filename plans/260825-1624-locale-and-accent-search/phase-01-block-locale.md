# Phase 01 — Block truyền locale

**Goal:** `/en` hiển thị nội dung tiếng Anh và `/vi` hiển thị tiếng Việt ở mọi block. Cache của hai locale tách biệt hoàn toàn.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/blocks/ArchiveBlock/query.ts` + `Component.tsx` | MODIFY |
| `src/blocks/CareersHighlight/query.ts` + `Component.tsx` | MODIFY |
| `src/blocks/CategoryShowcase/query.ts` + `Component.tsx` | MODIFY |
| `src/blocks/GamesPortfolio/query.ts` + `Component.tsx` | MODIFY |
| `src/blocks/IECLife/query.ts` + `Component.tsx` | MODIFY |
| `src/blocks/JobBoard/query.ts` + `Component.tsx` | MODIFY |

## 2. Thay đổi lặp lại cho từng block

**Trong `Component.tsx`** — lấy locale từ next-intl, đúng cách Footer/Header đang làm:

```ts
import { getLocale } from 'next-intl/server'
...
const locale = (await getLocale()) as 'en' | 'vi'
```

**Trong `query.ts`** — thêm `locale` vào **cả hai** chỗ:

```ts
export const getCachedIECLifePosts = (limit: number, locale: 'en' | 'vi') =>
  unstable_cache(
    async () => {
      const { docs } = await payload.find({
        collection: 'posts',
        locale,                       // ← 1. vào query
        ...
      })
      return docs
    },
    ['iec-life', String(limit), locale],   // ← 2. vào cache key
    { tags: ['posts'] },
  )
```

> Sửa một chỗ mà quên chỗ kia là lỗi tệ nhất có thể xảy ra ở phase này: thêm `locale` vào query mà không thêm vào key thì `/en` sẽ phục vụ bản cache của `/vi`. Luôn sửa hai dòng cùng lúc.

`GamesPortfolio` có **hai** hàm cached (`getCachedAllGames`, `getCachedGamesByIds`) — cả hai đều cần.

## 3. Vì sao an toàn

`payload.config.ts:106` đặt `fallback: true`. Doc chưa có bản dịch `vi` sẽ trả về giá trị `en` thay vì rỗng, nên bật locale không làm trang trống.

## 4. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] `grep -rn "locale" src/blocks/*/query.ts` — mỗi hàm cached đều có `locale` trong cả `payload.find` lẫn mảng keyParts.
- [ ] Mở `/vi` và `/en` cạnh nhau: block hiển thị nội dung khác ngôn ngữ nhau (với doc đã dịch).
- [ ] **Test cache không lẫn:** mở `/vi` trước, rồi `/en` — `/en` phải ra tiếng Anh, không phải bản tiếng Việt vừa cache. Rồi đảo thứ tự, làm lại.
- [ ] Doc chỉ có bản `en` vẫn hiển thị (fallback) ở `/vi`, không mất block.
- [ ] Sửa 1 post → reload cả hai locale → cả hai đều cập nhật (tag `posts` xóa mọi entry).

## 5. Out of scope

- Không đụng `getCachedSocials` — `social` không có field localized.
- Không sửa query cấp trang (đã truyền locale sẵn).

## 6. Commit message dự kiến

```
fix(blocks): query content in the active locale

Block components never passed a locale to Payload, so every listing came
back in the config default (en) and /vi rendered English content — or the
reverse once a doc had only a Vietnamese value. Each block now resolves
the request locale via next-intl and threads it through.

The locale also joins each cache key. Adding it to the query alone would
be worse than the bug: /en would serve whatever locale warmed the cache
first.
```
