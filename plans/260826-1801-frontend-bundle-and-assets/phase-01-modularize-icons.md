# Phase 01 — Deep-import icon Tabler qua modularizeImports

**Goal:** Sau phase này, không còn chunk nào chứa toàn bộ icon set Tabler. Mỗi `import { IconX } from '@tabler/icons-react'` trong `src/` được SWC viết lại thành import thẳng file `IconX.mjs`, nên chỉ 68 icon đang dùng vào bundle thay vì 6.148. Không đổi một dòng import nào trong `src/` (trừ một chỗ tách type).

Mục tiêu số: chunk `795 KB raw / 127 KB gzip` biến mất khỏi danh sách script của trang chủ.

---

## 1. Files chạm vào

| File | Action |
|---|---|
| `next.config.ts` | MODIFY |
| `src/blocks/CoreValuesShowcase/Component.tsx` | MODIFY |

**Việc phải làm trước khi bắt đầu:** cây làm việc đang có thay đổi chưa commit ở `next.config.ts`, `package.json`, `Dockerfile`, `docker-compose.yml`, `.env.example` (công việc `NEXT_BUILD_CPUS` / Docker build memory từ phiên khác). Commit hoặc stash chúng trước, để commit của phase này chỉ chứa thay đổi của phase này.

---

## 2. `next.config.ts`

Thêm key `modularizeImports` ở cấp cao nhất của `nextConfig`, đặt ngay trước `images`:

```ts
const nextConfig: NextConfig = {
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  // `@tabler/icons-react` nằm trong danh sách `optimizePackageImports` mặc định của
  // Next, nhưng barrel optimizer bail out vì barrel của package có namespace
  // re-export (`import * as index from './icons/index.mjs'; export { index as icons }`).
  // Hệ quả đo được trên production: một named import kéo cả 6.148 icon —
  // 795 KB raw / 127 KB gzip nằm trên critical path của trang chủ.
  //
  // Viết lại thẳng sang file icon riêng lẻ. File icon chỉ có default export
  // (`export { __iconNode, IconArrowRight as default }`) nên phải để
  // `skipDefaultConversion` ở mặc định (false) — transform tự đổi named import
  // thành default import.
  //
  // KHÔNG bật `preventFullImport`: `src/fields/IconPicker/IconPickerField.tsx`
  // cố ý dùng `import * as TablerIcons` (chỉ chạy trong admin, chấp nhận nạp full
  // icon set ở đó) và sẽ vỡ build nếu bật.
  modularizeImports: {
    '@tabler/icons-react': {
      transform: '@tabler/icons-react/dist/esm/icons/{{member}}.mjs',
    },
  },
  images: {
    // ... giữ nguyên
```

Không đụng gì khác trong file. Cụ thể **không** thêm vào `experimental` — key đó đang là spread có điều kiện (`...(buildCpus ? { experimental: {...} } : {})`), thêm vào sẽ bị ghi đè hoặc gây xung đột.

---

## 3. `src/blocks/CoreValuesShowcase/Component.tsx`

Khối import hiện tại trộn giá trị và type trong cùng một câu lệnh. `modularizeImports` sẽ cố map `IconProps` thành `@tabler/icons-react/dist/esm/icons/IconProps.mjs` — file không tồn tại → vỡ build.

Đã kiểm: trong 68 tên được import từ `@tabler/icons-react` trên toàn repo, 67 tên có file `.mjs` khớp; chỉ `IconProps` là type. Đây là chỗ duy nhất cần sửa.

**Trước** (dòng ~5–23):

```ts
import {
  IconBolt,
  // ... các icon khác
  type IconProps,
} from '@tabler/icons-react'
```

**Sau** — tách thành hai câu lệnh, `import type` bị TypeScript xoá hẳn nên transform không đụng tới:

```ts
import type { IconProps } from '@tabler/icons-react'
import {
  IconBolt,
  // ... các icon khác, giữ nguyên thứ tự
} from '@tabler/icons-react'
```

---

## 4. Ghi chú wiring

- Không sửa bất kỳ file nào trong `src/` ngoài file trên. 29 file còn lại import icon vẫn giữ nguyên cú pháp `import { IconX } from '@tabler/icons-react'` — đó chính là điểm hấp dẫn của phương án này.
- `src/components/TablerIcon/index.tsx` **không** được sửa ở phase này. Nó dùng glob dynamic import, là vấn đề khác (manifest 6.090 chunk) và thuộc phase 02.
- `src/fields/IconPicker/IconPickerField.tsx` **không** được sửa ở phase này. Nó là component admin, `import * as TablerIcons` ở đó là cố ý.

---

## 5. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` chạy sạch, không lỗi resolve module icon.
- [ ] **Không còn chunk chứa cả icon set.** Chạy sau build:
      `for f in .next/static/chunks/*.js; do n=$(grep -o 'Icon[A-Z][A-Za-z0-9]*' "$f" | sort -u | wc -l); [ "$n" -gt 100 ] && echo "$n $f"; done`
      → phải không in ra gì.
- [ ] Đếm tổng byte JS ban đầu của trang chủ sau build và ghi lại con số vào `plan.md` §2 (dạng ghi chú "sau phase 01"). So với baseline 721 KB gzip, kỳ vọng giảm ~127 KB.
- [ ] `pnpm start`, mở `http://localhost:3000/en` và `http://localhost:3000/vi`: các icon vẫn hiển thị đúng ở header, footer, block Core Values, nút search, language switcher, share widget.
- [ ] Mở `/admin`, vào một global/collection có field IconPicker: picker vẫn mở được và preview icon vẫn render (regression cho quyết định không bật `preventFullImport`).
- [ ] `pnpm lint` không phát sinh lỗi mới.

---

## 6. Out of scope (phase này)

- Không đụng `TablerIcon` và glob dynamic import của nó (phase 02).
- Không thu hẹp danh sách icon trong IconPicker (phase 02).
- Không gỡ `lucide-react` hay dep chết khác.
- Không đổi `images` trong `next.config.ts` (phase 03 làm).

---

## 7. Commit message dự kiến

```
perf(bundle): deep-import tabler icons instead of the package barrel

Barrel của @tabler/icons-react có namespace re-export (`export { index as
icons }`) khiến barrel optimizer của Next bail out, dù package nằm trong
optimizePackageImports mặc định. Đo trên production: một named import kéo cả
6.148 icon, 795 KB raw / 127 KB gzip nằm trên critical path trang chủ cho 68
icon thật sự dùng.

Thêm modularizeImports map {{member}} sang file icon riêng lẻ, giữ nguyên cú
pháp import ở 29 file trong src/. Tách `type IconProps` khỏi khối import giá
trị trong CoreValuesShowcase vì transform không phân biệt được type-only
import nằm chung câu lệnh. Không bật preventFullImport để IconPickerField
(admin-only) giữ được `import * as TablerIcons`.
```
