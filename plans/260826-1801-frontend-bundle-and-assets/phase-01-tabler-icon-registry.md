# Phase 01 — Thay glob dynamic import bằng registry tĩnh

**Goal:** Sau phase này, bundle không còn manifest ánh xạ 6.090 lazy chunk icon. `TablerIcon` render icon từ một registry tĩnh, hữu hạn, biết trước lúc build. Chunk `629 KB raw / 123 KB gzip` biến mất khỏi danh sách script của trang chủ.

**Chặn bởi:** không. Đây là phase đầu tiên và là phase ăn nhiều nhất — đo được −195 KB gzip (720.691 → 525.053) trên trang chủ.

**⚠ Cần xác nhận trước khi chạy:** xem `plan.md` §8. Phase này thu hẹp quyền chọn icon của editor. Nếu bạn không đồng ý đánh đổi đó thì phase này phải thiết kế lại.

---

## 1. Vấn đề

`src/components/TablerIcon/index.tsx:36`:

```js
import(`@tabler/icons-react/dist/esm/icons/${componentName}.mjs`)
```

Dynamic import có biến trong đường dẫn buộc bundler tạo chunk cho **mọi** file khớp glob (6.090 icon) cộng một manifest tên→chunk. Manifest đó là **initial chunk**, tải ngay khi vào trang chủ. Comment trên hàm nói bundle "chỉ chứa icon thực sự được dùng" — mô tả đúng ý định, ngược với thực tế đo được.

Đường vào graph trang chủ: `page.tsx` → `RenderHero` → `heros/VideoHero/RenderVideoHeroBlocks.tsx` → `PolicyTabsBlock` → `TablerIcon`. Trang chủ dùng `BrandHero` chứ không phải `VideoHero`, nhưng `RenderHero` import tĩnh mọi biến thể nên vẫn dính. Phase 04 xử lý phần import tĩnh đó; phase này xử lý gốc.

---

## 2. Files chạm vào

| File | Action |
|---|---|
| `src/components/TablerIcon/iconRegistry.ts` | CREATE |
| `src/components/TablerIcon/index.tsx` | MODIFY |
| `src/fields/IconPicker/IconPickerField.tsx` | MODIFY |
| `scripts/collect-cms-icons.ts` | CREATE |
| `src/utilities/tablerIcon.ts` | DELETE |
| `src/types/tabler.d.ts` | DELETE |

Hai dòng DELETE được thêm vào bảng trong lúc thi công (2026-08-27). Cả hai chỉ tồn tại để phục vụ cơ chế cũ và thành code chết ngay khi cơ chế đó biến mất: `toIconComponentName` chỉ được `TablerIcon` và `IconPickerField` gọi, còn `tabler.d.ts` chỉ khai báo module cho `icons-list.mjs` mà không còn ai import. Đã grep toàn repo (`src/`, `scripts/`, `tests/`) xác nhận không còn tham chiếu.

---

## 3. Bước 1 — Quét icon đang dùng trong DB

Trước khi chốt registry, phải biết editor đã chọn những icon nào, nếu không sẽ làm icon đang hiển thị biến mất im lặng.

`scripts/collect-cms-icons.ts` dùng Local API của Payload, quét mọi field `icon` trong nội dung (block `policyTabs` nằm trong `hero.blocks` của `pages`/`home`/`career`), in ra danh sách giá trị phân biệt. Chạy bằng `pnpm exec tsx scripts/collect-cms-icons.ts`, theo đúng lối các script sẵn có trong `scripts/`.

Nếu không kết nối được DB production, dừng lại và hỏi — **không** đoán danh sách.

---

## 4. Bước 2 — `iconRegistry.ts`

Registry là một map tên kebab-case → component, dựng bằng named import thường — `optimizePackageImports` mặc định của Next xử lý được, đã kiểm chứng bằng đo (xem `plan.md` §3.1):

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

Sau thay đổi này file không còn `import * as TablerIcons`, nên chunk 6.195 icon của bundle admin cũng biến mất luôn. Đó là phần thưởng kèm theo, không phải mục tiêu — chunk đó chưa bao giờ nằm trên trang chủ (đã đo, xem `plan.md` §3.1).

Không thêm `modularizeImports` / `preventFullImport` vào `next.config.ts`: đã đo và chúng chỉ tiết kiệm 736 B (`plan.md` §3.1).

---

## 7. Acceptance criteria

- [ ] `scripts/collect-cms-icons.ts` chạy được, in ra danh sách icon trong DB.
- [ ] **Mọi tên trong danh sách đó đều có mặt trong `iconRegistry`.** So khớp bằng script, in ra tên thiếu; phải rỗng.
- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` sạch.
- [ ] **Manifest biến mất.** Sau build:
      `for f in .next/static/chunks/*.js; do n=$(grep -o 'static/chunks/' "$f" | wc -l); [ "$n" -gt 500 ] && echo "$n $f"; done`
      → phải không in ra gì.
- [ ] **Số chunk trong `.next/static/chunks/` về khoảng 95** (probe ngày 2026-08-27 cho đúng con số này; trước phase là ~6.000).
- [ ] **Không chunk nào chứa cả icon set nằm trên trang chủ.** Lấy danh sách chunk từ HTML rồi đối chiếu:
      `curl -s --compressed http://localhost:3100/en | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u`
      → không chunk nào trong danh sách đó có >100 tên `Icon*` phân biệt.
- [ ] **Tổng JS gzip trang chủ ≈ 525.000 B** (baseline 720.691 B). Đây là con số probe đã đạt được; registry thật phải đạt lại xấp xỉ.
- [ ] `pnpm start`: trang có block PolicyTabs render đủ icon như trước. Nếu không có trang nào dùng block này trên môi trường dev, tạo tạm một trang draft để kiểm rồi xoá.
- [ ] `/admin`: IconPicker mở được, tìm kiếm hoạt động, chọn icon lưu được, preview đúng.
- [ ] Ghi lại tổng byte JS trang chủ vào `plan.md` §2 (ghi chú "sau phase 01").

---

## 8. Out of scope (phase này)

- Không đụng `RenderHero` / `RenderBlocks` (phase 04).
- Không đổi schema field `icon` (vẫn là text lưu kebab-case).
- Không viết migration đổi dữ liệu icon đang có.

---

## 9. Commit message dự kiến

```
perf(bundle): render tabler icons from a static registry

TablerIcon dùng `import(\`…/${componentName}.mjs\`)` — dynamic import có biến
trong path, nên bundler phải sinh chunk cho cả 6.090 icon cộng manifest
tên→chunk, và kéo luôn toàn bộ icon set vào graph frontend. Trang chủ phải tải
cả hai (795 KB + 629 KB raw) dù không render icon động nào.

Thay bằng iconRegistry tĩnh, seed từ giá trị icon đang có trong DB. IconPicker
đọc cùng registry nên editor không chọn được icon mà frontend không render
được. TablerIcon hết cần lazy loading nên bỏ 'use client' — icon vào thẳng HTML.

Đo trên trang chủ: 720.691 -> 525.053 B gzip (-195 KB, -27%), số chunk từ
~6.000 xuống 95. Đã thử `modularizeImports` trước và loại bỏ: transform chạy
đúng nhưng chỉ tiết kiệm 736 B, vì glob import đã kéo sẵn mọi icon vào graph.
```
