# Phase 03 — Sửa layout shift và 508 KB của logo

**Goal:** Sau phase này, header không còn nhảy khi logo load, và logo không còn là file PNG 508 KB tải thẳng từ GCS. CLS desktop từ **0,254** phải về dưới 0,1.

---

## 1. Vấn đề

**Layout shift.** `src/components/Logo/Logo.tsx` có hằng số fallback `NATURAL_WIDTH = 193 / NATURAL_HEIGHT = 34` (tỉ lệ 5,68:1). Ảnh logo thật là **2316×954** (tỉ lệ 2,43:1), render ra 121×50. Browser dành sẵn ô cao 34px theo attribute, ảnh load xong nhảy lên 50px, đẩy toàn bộ nội dung dưới header xuống.

`src/Header/Component.tsx:12-21` **đã** đọc `logoMedia` kèm `width`/`height`:

```ts
const logoMedia =
  generalData?.logo && typeof generalData.logo === 'object'
    ? (generalData.logo as { url?: string; alt?: string; width?: number; height?: number })
    : undefined
```

…nhưng chỉ truyền `logoSrc` và `logoAlt` xuống. `imgWidth`/`imgHeight` không bao giờ tới `<Logo>`, nên nhánh fallback luôn thắng. Đây là lỗi quên nối dây, không phải lỗi thiết kế.

**Dung lượng.** `Logo.tsx` dùng `<img>` thuần với URL GCS gốc → bỏ qua Next image optimizer hoàn toàn:

```
storage.googleapis.com/iec-media-prod/iec logo.png
  Content-Length: 508.694
  Cache-Control: public, max-age=3600
```

Nửa MB PNG để hiển thị ở `max-h-12.5` (50px). Đây cũng chính là audit "cache lifetime, 398 KiB" của Lighthouse — GCS trả `max-age=3600`, quá ngắn cho một asset gần như không đổi.

**Ưu tiên tải.** Cả hai chỗ dùng `<Logo>` đều đặt `loading="eager" priority="high"`:
- `src/Header/Component.client.tsx:67`
- `src/Footer/Component.tsx:166-173`

Logo footer nằm cuối trang nhưng vẫn được preload ở mức cao, cạnh tranh băng thông với LCP.

---

## 2. Files chạm vào

| File | Action |
|---|---|
| `src/components/Logo/Logo.tsx` | MODIFY |
| `src/Header/Component.tsx` | MODIFY |
| `src/Header/Component.client.tsx` | MODIFY |
| `src/Footer/Component.tsx` | MODIFY |

---

## 3. `Header/Component.tsx` + `Component.client.tsx`

Nối `logoMedia.width` / `logoMedia.height` xuống `<Logo>`: thêm hai prop vào `HeaderClientProps`, truyền từ server component, truyền tiếp vào `<Logo imgWidth={…} imgHeight={…} />`.

Không đổi gì khác về layout header.

---

## 4. `Footer/Component.tsx`

- Truyền `imgWidth`/`imgHeight` từ `activeMedia` (đã có sẵn ở dòng 92, cùng nguồn với `logoSrc`).
- **Bỏ `loading="eager" priority="high"`** — logo footer luôn nằm ngoài viewport ban đầu. Để mặc định (`loading="lazy"`, `priority="low"`).

---

## 5. `Logo.tsx`

Chuyển từ `<img>` sang `next/image` để logo đi qua optimizer (resize + WebP) và được phục vụ với cache dài từ chính domain thay vì `max-age=3600` của GCS.

Ràng buộc khi làm:
- `storage.googleapis.com` đã có trong `images.remotePatterns` của `next.config.ts` → không cần thêm gì.
- Giữ nguyên các class `LOGO_SIZE` và `className` truyền vào, để giao diện không đổi.
- `FALLBACK_SRC` đang trỏ `raw.githubusercontent.com` — host này **không** nằm trong `remotePatterns`. Đổi fallback sang một file tĩnh trong `public/`, hoặc render `null` khi không có logo. Không thêm `raw.githubusercontent.com` vào `remotePatterns` chỉ để đỡ một fallback không bao giờ dùng ở production.
- Giữ hằng số `NATURAL_WIDTH`/`NATURAL_HEIGHT` làm fallback cuối, nhưng sửa lại cho khớp tỉ lệ của logo thật nếu fallback mới có tỉ lệ khác.

---

## 6. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm lint` không lỗi mới.
- [ ] `pnpm build` sạch.
- [ ] `curl -s http://localhost:3000/en | grep -o '<img[^>]*logo[^>]*>'` — attribute `width`/`height` khớp tỉ lệ 2316×954, không còn 193×34.
- [ ] Request logo đi qua `/_next/image`, **không** còn URL `storage.googleapis.com` trực tiếp trong HTML.
- [ ] Byte của logo giảm ít nhất 90% so với 508.694 (kỳ vọng vài chục KB ở dạng WebP đúng kích thước).
- [ ] Header trông y hệt bản hiện tại ở 390px, 768px, 1440px. So sánh ảnh chụp cạnh nhau với production.
- [ ] Footer vẫn hiển thị logo đúng, kể cả biến thể `monoMedia` (class `brightness-0 invert`).
- [ ] **Đo CLS thật**: `pnpm start`, mở trang chủ ở chế độ ẩn danh với cache tắt, chạy trong console:
      ```js
      let cls = 0
      new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value }))
        .observe({ type: 'layout-shift', buffered: true })
      setTimeout(() => console.log('CLS', cls), 5000)
      ```
      → phải < 0,1. Nếu vẫn ≥ 0,1 thì còn nguồn shift khác — ghi lại `e.sources` và dừng, không đoán.

---

## 7. Out of scope (phase này)

- Không nén lại / thay file logo gốc trên GCS. Việc đó cần editor upload lại; sau phase này đo lại rồi hẵng đề xuất.
- Không đụng `getMediaUrl` hay `ImageMedia`.
- Không đổi layout hay kích thước hiển thị của header/footer.

---

## 8. Commit message dự kiến

```
fix(logo): pass real dimensions and route the logo through next/image

Logo.tsx rơi vào hằng số fallback 193x34 (tỉ lệ 5,68:1) trong khi ảnh thật là
2316x954 (2,43:1), render ra 121x50. Browser dành sẵn ô cao 34px rồi nhảy lên
50px khi ảnh load, đẩy cả trang xuống — đo được CLS 0,254 trên desktop.
Header/Component.tsx đã đọc width/height của media nhưng quên truyền xuống.

Nối dây imgWidth/imgHeight, và đổi <img> thuần sang next/image để logo đi qua
optimizer: 508 KB PNG thô từ GCS (Cache-Control max-age=3600) trở thành WebP
đúng kích thước, cache dài, phục vụ từ chính domain. Bỏ priority="high" ở logo
footer vì nó luôn nằm ngoài viewport đầu tiên.
```
