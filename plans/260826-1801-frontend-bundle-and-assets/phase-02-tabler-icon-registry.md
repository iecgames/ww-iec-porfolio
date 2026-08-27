# Phase 02 — Thay glob dynamic import bằng registry tĩnh

**Goal:** Sau phase này, bundle không còn manifest ánh xạ 6.090 lazy chunk icon. `TablerIcon` render icon từ một registry tĩnh, hữu hạn, biết trước lúc build. Chunk `629 KB raw / 123 KB gzip` biến mất khỏi danh sách script của trang chủ.

**Chặn bởi:** phase 01 (registry dựa trên deep import mà `modularizeImports` thiết lập).

**⚠ Cần xác nhận trước khi chạy:** xem `plan.md` §8. Phase này thu hẹp quyền chọn icon của editor. Nếu bạn không đồng ý đánh đổi đó thì phase này phải thiết kế lại.

---

## 1. Vấn đề

`src/components/TablerIcon/index.tsx:36`:

```js
import(`@tabler/icons-react/dist/esm/icons/${componentName}.mjs`)
```

Dynamic import có biến trong đường dẫn buộc bundler tạo chunk cho **mọi** file khớp glob (6.090 icon) cộng một manifest tên→chunk. Manifest đó là **initial chunk**, tải ngay khi vào trang chủ. Comment trên hàm nói bundle "chỉ chứa icon thực sự được dùng" — mô tả đúng ý định, ngược với thực tế đo được.

Đường vào graph trang chủ: `page.tsx` → `RenderHero` → `heros/VideoHero/RenderVideoHeroBlocks.tsx` → `PolicyTabsBlock` → `TablerIcon`. Trang chủ dùng `BrandHero` chứ không phải `VideoHero`, nhưng `RenderHero` import tĩnh mọi biến thể nên vẫn dính. Phase 05 xử lý phần import tĩnh đó; phase này xử lý gốc.

---

## 2. Files chạm vào

| File | Action |
|---|---|
| `src/components/TablerIcon/iconRegistry.ts` | CREATE |
| `src/components/TablerIcon/index.tsx` | MODIFY |
| `src/fields/IconPicker/IconPickerField.tsx` | MODIFY |
| `scripts/collect-cms-icons.ts` | CREATE |

---

## 3. Bước 1 — Quét icon đang dùng trong DB

Trước khi chốt registry, phải biết editor đã chọn những icon nào, nếu không sẽ làm icon đang hiển thị biến mất im lặng.

`scripts/collect-cms-icons.ts` dùng Local API của Payload, quét mọi field `icon` trong nội dung (block `policyTabs` nằm trong `hero.blocks` của `pages`/`home`/`career`), in ra danh sách giá trị phân biệt. Chạy bằng `pnpm exec tsx scripts/collect-cms-icons.ts`, theo đúng lối các script sẵn có trong `scripts/`.

Nếu không kết nối được DB production, dừng lại và hỏi — **không** đoán danh sách.

---

## 4. Bước 2 — `iconRegistry.ts`

Registry là một map tên kebab-case → component, dựng bằng named import thường (phase 01 đã lo việc biến chúng thành deep import):

```ts
import { IconCheck, IconShield /* … */ } from '@tabler/icons-react'
import type { ComponentType } from 'react'

export type TablerIconComponent = ComponentType<{
  size?: number | string
  stroke?: number | string
  color?: string
  className?: string
}>

/**
 * Tập icon hữu hạn mà editor được chọn và frontend render được.
 *
 * Cố ý KHÔNG dùng dynamic import theo biến: bundler sẽ phải sinh chunk cho cả
 * 6.090 icon cộng một manifest 629 KB nằm trên critical path. Thêm icon mới =
 * thêm một dòng ở đây.
 *
 * Danh sách seed từ `scripts/collect-cms-icons.ts` (icon đang có trong DB) hợp
 * với bộ mặc định bên dưới.
 */
export const iconRegistry = {
  check: IconCheck,
  shield: IconShield,
  // …
} satisfies Record<string, TablerIconComponent>

export type RegisteredIconName = keyof typeof iconRegistry
export const registeredIconNames = Object.keys(iconRegistry) as RegisteredIconName[]
```

---

## 5. Bước 3 — `TablerIcon/index.tsx`

Bỏ `next/dynamic`, bỏ `iconCache`, bỏ `toIconComponentName` (registry dùng thẳng kebab-case). Tra registry, không khớp thì trả `null` — cùng hành vi với nhánh `.catch(() => ({ default: () => null }))` hiện tại, nên không phải regression về kiểu.

Component không còn state hay lazy loading → bỏ luôn `'use client'`, để nó render phía server. Đây là phần thưởng kèm theo: icon vào thẳng HTML, không cần JS.

---

## 6. Bước 4 — `IconPickerField.tsx`

Đổi nguồn danh sách từ `@tabler/icons-react/dist/esm/icons-list.mjs` (6.090 tên) sang `registeredIconNames`, và đổi `iconMap` từ `import * as TablerIcons` sang `iconRegistry`.

Sau thay đổi này file không còn `import * as TablerIcons` → **có thể** bật `preventFullImport: true` ở `next.config.ts`. Nếu bật, ghi rõ trong commit message và cập nhật bảng quyết định ở `plan.md` §4. Nếu còn chỗ nào khác dùng full import thì để nguyên.

---

## 7. Acceptance criteria

- [ ] `scripts/collect-cms-icons.ts` chạy được, in ra danh sách icon trong DB.
- [ ] **Mọi tên trong danh sách đó đều có mặt trong `iconRegistry`.** So khớp bằng script, in ra tên thiếu; phải rỗng.
- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` sạch.
- [ ] **Manifest biến mất.** Sau build:
      `for f in .next/static/chunks/*.js; do n=$(grep -o 'static/chunks/' "$f" | wc -l); [ "$n" -gt 500 ] && echo "$n $f"; done`
      → phải không in ra gì.
- [ ] Số chunk trong `.next/static/chunks/` giảm mạnh so với trước phase (ghi lại cả hai con số).
- [ ] `pnpm start`: trang có block PolicyTabs render đủ icon như trước. Nếu không có trang nào dùng block này trên môi trường dev, tạo tạm một trang draft để kiểm rồi xoá.
- [ ] `/admin`: IconPicker mở được, tìm kiếm hoạt động, chọn icon lưu được, preview đúng.
- [ ] Ghi lại tổng byte JS trang chủ vào `plan.md` §2 (ghi chú "sau phase 02").

---

## 8. Out of scope (phase này)

- Không đụng `RenderHero` / `RenderBlocks` (phase 05).
- Không đổi schema field `icon` (vẫn là text lưu kebab-case).
- Không viết migration đổi dữ liệu icon đang có.

---

## 9. Commit message dự kiến

```
perf(bundle): render tabler icons from a static registry

TablerIcon dùng `import(\`…/${componentName}.mjs\`)` — dynamic import có biến
trong path, nên bundler phải sinh chunk cho cả 6.090 icon cộng manifest
tên→chunk. Manifest đó là initial chunk: 629 KB raw / 123 KB gzip tải ngay khi
vào trang chủ, dù trang chủ không render icon động nào.

Thay bằng iconRegistry tĩnh, seed từ giá trị icon đang có trong DB. IconPicker
đọc cùng registry nên editor không chọn được icon mà frontend không render
được. TablerIcon hết cần lazy loading nên bỏ 'use client' — icon vào thẳng HTML.
```
