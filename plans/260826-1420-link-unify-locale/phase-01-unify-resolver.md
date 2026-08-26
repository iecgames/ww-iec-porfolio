# Phase 01 — Một bản logic phân giải link

**Goal:** `CMSLink` không còn tự phân giải href; nó gọi `resolveLinkHref`. Hành vi hiển thị không đổi so với hiện tại.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/utilities/resolveLinkHref.ts` | MODIFY — thêm nhánh fallback về `url` |
| `src/components/Link/index.tsx` | MODIFY — bỏ if/else, gọi helper |

## 2. `resolveLinkHref` — thêm fallback

Hiện tại hàm trả `null` khi `type` không khớp nhánh nào. `CMSLink` thì rơi về `url`. Doc cũ có thể chưa set `type`, nên **phải theo hành vi của `CMSLink`**, nếu không link của chúng biến mất khỏi giao diện.

Thêm ở cuối, trước `return null`:

```ts
// Documents written before `type` existed, or with an unrecognised value, still
// carry a plain url. CMSLink has always fallen back to it; keep that.
if (link.url) {
  return { href: link.url, external: /^https?:\/\//i.test(link.url) }
}
```

## 3. `CMSLink` — gọi helper

Thay khối:

```ts
let href: string | null | undefined
if (type === 'reference' && ...) { ... }
else if (type === 'route') { href = route }
else if (type === 'section') { href = section }
else { href = url }
if (!href) return null
```

bằng:

```ts
const resolved = resolveLinkHref({ type, reference, route, section, url })
if (!resolved) return null
const { href } = resolved
```

Sau đó bỏ luôn `href || url || ''` ở hai chỗ render — `href` đã chắc chắn có giá trị.

## 4. Một khác biệt nhỏ phải giữ

`CMSLink` dựng href cho `reference` bằng:

```ts
`${reference?.relationTo !== 'pages' ? `/${reference?.relationTo}` : ''}/${value.slug}`
```

`resolveLinkHref` dùng:

```ts
`${relationTo === 'posts' ? '/posts' : ''}/${value.slug}`
```

Hai cái cho kết quả **giống nhau** với `pages` và `posts` — là hai giá trị duy nhất `relationTo` nhận được (`fields/link.ts:96` khai `relationTo: ['pages', 'posts']`). Không cần đổi gì.

## 5. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] `grep -n "else if (type ===" src/components/Link/index.tsx` → 0 kết quả (không còn bản logic thứ hai).
- [ ] Render thật, so HTML trước/sau cho từng loại link — **không được đổi**:
  - `type: 'reference'` → `/ten-trang`, post → `/posts/ten-bai`
  - `type: 'route'` → `/posts`
  - `type: 'section'` → `#anchor`
  - `type: 'custom'` → `https://…`
  - `type` rỗng nhưng có `url` → vẫn ra `url` (ca hồi quy quan trọng nhất)
- [ ] Link không có href nào hợp lệ → không render (`return null`), không ra thẻ `<a href="">`.

## 6. Commit message dự kiến

```
refactor(link): resolve CMS links through a single helper

CMSLink and resolveLinkHref each carried their own copy of the same
branching, and they had already drifted: CMSLink fell back to `url` for an
unrecognised type while resolveLinkHref returned null, and only the latter
reported whether a link points off-site.

CMSLink now calls resolveLinkHref. The helper gains the same url fallback
CMSLink always had, so documents saved before `type` existed keep working.
```
