# Cắt bundle JS và asset thừa trên frontend công khai

**Date:** 2026-08-26 18:01 (Asia/Ho_Chi_Minh)
**Scope:** `next.config.ts`, `src/components/Media/`, `src/components/Logo/`, `src/components/TablerIcon/`, `src/fields/IconPicker/`, `src/blocks/`, `src/heros/`, `src/Header/`, `src/Footer/`, `src/app/(frontend)/`
**Trigger:** Báo cáo PageSpeed Insights ngày 2026-08-26 cho `https://ww-iec.haleinteractive.vn/en`: performance **54 (mobile) / 63 (desktop)**. Đo trực tiếp trên bản production cho thấy nguyên nhân không nằm ở server mà ở những gì gửi xuống browser: 35% JS trang chủ là icon không dùng, và mọi ảnh đều tải bản 3840px. Sau khi xong, một lượt xem trang chủ phải nhẹ hơn hiện tại ~450 KB gzip mà không đổi giao diện.
**Tiếp nối:** `plans/260825-1411-perf-vps-optimization` — plan đó đã ghi trong mục "Out of scope": *"Không tối ưu bundle client (framer-motion, heroui) — cần đo trước, để task sau"*. Đây là task sau đó. Không phải revert; plan cũ không sai, chỉ cố ý hoãn.

---

## 1. Goal

Giảm khối lượng byte trên critical path của trang chủ và các trang public, không đổi giao diện, không đổi schema, không đụng luồng draft/live-preview. Cụ thể: gỡ toàn bộ icon set Tabler khỏi bundle, để browser tải ảnh đúng kích thước hiển thị thay vì bản 3840px, sửa layout shift do logo, và hoãn nạp JS của các block nằm dưới màn hình đầu. Kết thúc task, `pnpm build` chạy sạch, `docker compose up` khởi động được, và số đo Lighthouse mới được ghi lại để so sánh với baseline dưới đây.

---

## 2. Baseline đã đo (2026-08-26, bản production)

Mọi con số dưới đây đo trực tiếp trên `https://ww-iec.haleinteractive.vn/en`, dùng làm mốc so sánh cho phase cuối.

### 2.1 Điểm số PageSpeed Insights

| | Mobile | Desktop |
|---|---|---|
| Performance | 54 | 63 |
| Accessibility | 95 | 95 |
| Best Practices | 96 | 96 |
| SEO | 100 | 100 |

| Metric | Mobile | Desktop |
|---|---|---|
| FCP | 2,9 s | 0,6 s |
| LCP | 8,9 s | 2,5 s |
| TBT | 370 ms | 180 ms |
| CLS | 0,052 | 0,254 |
| Speed Index | 7,9 s | 2,6 s |

### 2.2 Khối lượng truyền tải

| Hạng mục | Số đo |
|---|---|
| HTML document | 72 KB gzip / 551 KB raw, TTFB ~0,68 s |
| JS | **26 chunk, 721 KB gzip** |
| CSS | 4 file, lớn nhất 51,7 KB |
| Ảnh | 14/16 `<img>` request ở `w=3840&q=80` |

### 2.3 Bốn chunk JS lớn nhất

| Chunk | gzip | raw | Nội dung |
|---|---|---|---|
| `0bl90~8dn0cuf.js` | 127 KB | 795 KB | **6.148 icon Tabler** (đếm được 6148 tên `Icon*` phân biệt) |
| `0hhk-.3-8bgly.js` | 123 KB | 629 KB | **Manifest trỏ tới 6.090 lazy chunk**, mỗi icon một chunk |
| `0.zvn16_8csew.js` | 71 KB | 227 KB | react-dom |
| `0du1vfyvr~24..js` | 52 KB | 247 KB | @heroui + @react-aria |

→ **250 KB / 721 KB gzip (35%) là icon**, cho 68 icon thật sự được import trong `src/`.

### 2.5 Tiến độ đo được theo phase (local)

Đo cùng một cách với bảng §3.1 nên so với nhau được; **không** so thẳng với bảng PSI §2.1 vì đây là máy dev với DB khác.

| Mốc | Tổng JS gzip trang chủ | Số chunk `.next/static/chunks/` | Server |
|---|---|---|---|
| Trước phase 01 | 720.691 B | ~6.000 | `pnpm start` ⚠ |
| Probe (bỏ hẳn `TablerIcon`) | 525.053 B | 95 | `pnpm start` ⚠ |
| Sau phase 01 (registry 155 icon) | 534.316 B | 97 | `pnpm start` ⚠ |
| **Sau phase 01–03** | **528.625 B** | **95** | standalone ✓ |
| Thử phase 04 (`dynamic()`) | 532.549 B | 97 | standalone ✓ — **tệ hơn, đã revert** |

Phase 01 cắt được **−186 KB (−26%)**, và đó là gần như toàn bộ phần cắt được của cả task.

⚠ **Các dòng `pnpm start` đo trên server không render được nội dung** — Next cảnh báo `"next start" does not work with "output: standalone"` và mình bỏ qua. Đã kiểm lại: con số sau phase 01–03 trên server chạy đúng là 528.625 B, sát với 534.316 B đo bằng cách sai, nên các dòng cũ vẫn dùng để so tương đối được. Cách chạy server đúng: `phase-03-logo-cls.md` §9.

Chênh ~9 KB so với probe là 155 icon của registry. Lúc lập plan mình viết *"Phase 04 sẽ đẩy phần này ra khỏi trang chủ"* — **sai**. Phase 04 đã thi công, đo, và bị bỏ: `dynamic()` không gỡ được registry khỏi chunk tải ngay mà còn làm nặng thêm 3,9 KB. Nguyên nhân thật nằm ở tầng chia chunk của Turbopack, không ở tầng import. Xem `phase-04-lazy-blocks.md` §4.

### 2.4 Ảnh

| | |
|---|---|
| Ảnh hero `w=3840` | 562 KB webp |
| Cùng ảnh `w=1200` | 226 KB webp |
| Logo `iec logo.png` | **508.694 byte**, tải thẳng từ GCS (không qua optimizer), `Cache-Control: public, max-age=3600` |
| Số lần logo xuất hiện | 2 (Header + Footer), **cả hai đều `loading="eager" priority="high"`** |

---

## 3. Nguyên nhân gốc đã kiểm chứng

### 3.1 Vì sao toàn bộ 6.148 icon vào bundle — ĐÃ ĐO LẠI, GIẢ THUYẾT BAN ĐẦU SAI

**Giả thuyết ban đầu (sai):** barrel của package mở đầu bằng namespace re-export —

```js
import * as index from './icons/index.mjs';
export { index as icons };
```

— nên `optimizePackageImports` bail out và mọi named import kéo nguyên barrel. Từ đó suy ra cách sửa là thêm `modularizeImports` vào `next.config.ts`.

**Thực đo ngày 2026-08-27** cho thấy suy luận đó không đúng. Bốn lần build, đo tổng JS gzip của trang chủ trên `pnpm start`:

| `modularizeImports` | glob import trong `TablerIcon` | Tổng JS gzip trang chủ |
|---|---|---|
| tắt (baseline production) | bật | 721.313 B |
| **bật** | bật | 720.691 B |
| bật | tắt | 525.053 B |
| tắt | tắt | 525.789 B |

`modularizeImports` đóng góp **736 byte**. Toàn bộ 195 KB tiết kiệm đến từ việc bỏ glob dynamic import ở §3.2.

Transform **có chạy** — kiểm chứng bằng cách trỏ `transform` vào đường dẫn bịa (`ZZZ_BOGUS_{{member}}.mjs`), build vỡ đúng tại `CoreValuesShowcase/Component.tsx:8`, `LanguageSwitcher/index.tsx:4`, `Header/MobileMenu/index.tsx:13`. Nó chỉ không giải quyết được gì, vì glob import đã kéo sẵn toàn bộ icon vào graph; barrel có bị tree-shake hay không cũng không còn ý nghĩa.

**Hệ quả:** bỏ hẳn phương án `modularizeImports`. Sau khi §3.2 được sửa, `optimizePackageImports` mặc định của Next xử lý named import đủ tốt — đo được chunk icon **không** xuất hiện trên trang chủ ở cả hai cấu hình cuối bảng. Chunk 6.195 icon còn lại chỉ nằm trong bundle admin, đến từ `import * as TablerIcons` của `IconPickerField`, đúng như thiết kế.

### 3.2 Vì sao có 6.090 lazy chunk — đây mới là nguyên nhân thật

`src/components/TablerIcon/index.tsx:36`:

```js
import(`@tabler/icons-react/dist/esm/icons/${componentName}.mjs`)
```

Dynamic import với biến trong template literal buộc bundler phải tạo chunk cho **mọi** file khớp glob — cả 6.090 icon — cộng một manifest ánh xạ tên → chunk. Manifest đó là **initial chunk**, không lazy. Comment ngay trên hàm ("bundle ở frontend chỉ chứa icon thực sự được dùng") mô tả đúng ý định nhưng ngược với thực tế.

`TablerIcon` vào được graph trang chủ qua đường: `page.tsx` → `RenderHero` → `heros/VideoHero/RenderVideoHeroBlocks.tsx` → `PolicyTabsBlock` → `TablerIcon`. Trang chủ dùng `BrandHero`, không dùng `VideoHero`, nhưng `RenderHero` import tĩnh mọi biến thể hero nên vẫn dính.

### 3.3 Vì sao ảnh nào cũng là bản 3840px

`src/components/Media/ImageMedia/index.tsx:83-85`:

```js
Object.entries(breakpoints)
  .map(([, value]) => `(max-width: ${value}px) ${value * 2}w`)
  .join(', ')
```

Sinh ra `sizes="(max-width: 1920px) 3840w, (max-width: 1536px) 3072w, …"`. Descriptor `w` **không hợp lệ** trong thuộc tính `sizes` — chỗ đó phải là một độ dài (`px`, `vw`, `em`…). Browser vứt cả list, fallback về `100vw`, Next chọn candidate lớn nhất là 3840.

Quét toàn repo: 20 chỗ gọi `<Media>`, chỉ **5** truyền `size` hợp lệ; **15** chỗ còn lại rơi vào default hỏng này. Ví dụ cụ thể đo trên DOM thật: ảnh cover game render ở **340×604** nhưng tải bản **3840px**.

Đây là bug có sẵn của Payload website template, không phải code viết thêm.

### 3.4 Vì sao CLS desktop = 0,254

`src/components/Logo/Logo.tsx` dùng hằng số fallback `NATURAL_WIDTH = 193 / NATURAL_HEIGHT = 34` (tỉ lệ 5,68:1). Ảnh logo thật là **2316×954** (tỉ lệ 2,43:1), render ra 121×50.

`src/Header/Component.tsx:14` đã ép kiểu `logoMedia` kèm `width`/`height`, nhưng dòng 20-21 **chỉ truyền `logoSrc` và `logoAlt`** — `imgWidth`/`imgHeight` không bao giờ tới `<Logo>`. Browser dành sẵn ô cao 34px, ảnh load xong nhảy lên 50px, đẩy toàn bộ nội dung dưới header xuống.

### 3.5 Lỗi hydration

Console trang chủ có `Minified React error #418` — hydration mismatch dạng text. React phải render lại cây ở client, ăn thẳng vào TBT. Chưa xác định được component nào; cần build dev để đọc thông báo đầy đủ.

---

## 4. Quyết định đã chốt (từ Q&A vòng 1)

| Câu hỏi | Lựa chọn |
|---|---|
| ~~Cách sửa 250 KB icon Tabler: `modularizeImports`~~ | **HUỶ sau khi đo (2026-08-27).** Đo được nó chỉ tiết kiệm 736 B — xem §3.1. Nguyên nhân thật là glob dynamic import ở §3.2. Không thêm `modularizeImports` vào `next.config.ts` |
| ~~`preventFullImport`~~ | Không còn liên quan sau khi huỷ quyết định trên |
| HTML `Cache-Control: private, no-cache, no-store` | **Giữ nguyên route dynamic.** Đúng theo quyết định của plan `260825-1411` (cache ở tầng query bằng tag). Chuyển ISR đụng luồng draft/live-preview, lợi ~0,3 s TTFB — để task riêng |
| framer-motion (21 file, ~52 KB gzip) | **Chỉ `dynamic()` các block dưới màn hình đầu.** Không viết lại animation, không gỡ thư viện |
| Lỗi hydration React #418 | **Có, thành phase riêng** (phase 06) |
| Danh sách icon cho `TablerIcon` / IconPicker | **Registry tĩnh** seed từ giá trị icon đang có trong DB, hợp với một bộ mặc định. Picker chỉ cho chọn trong registry. *Đây là quyết định do mình đề xuất, chưa qua Q&A — xem §8, cần bạn xác nhận trước khi chạy phase 02* |
| `lucide-react` | **Không đụng.** Đã kiểm: 0 chỗ import trong `src/` → không nằm trong bundle. Gỡ nó không cải thiện tốc độ. Để phase dọn dep của task khác |

---

## 5. Phase breakdown

Bảng này đã đánh số lại ngày 2026-08-27 sau khi phase `modularizeImports` bị huỷ (§3.1). File phase cũ đã xoá, không còn file nào trùng số.

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | `phase-01-tabler-icon-registry.md` | Thay glob dynamic import bằng registry tĩnh → xoá chunk icon 795 KB + manifest 6.090 chunk | — |
| 02 | `phase-02-image-sizes.md` | Sửa `sizes` hỏng trong `ImageMedia`, truyền `size` cho 15 call site, giới hạn `deviceSizes` | — |
| 03 | `phase-03-logo-cls.md` | Truyền kích thước thật cho `<Logo>`, cho logo đi qua `next/image`, bỏ `priority="high"` ở Footer | — |
| ~~04~~ | `phase-04-lazy-blocks.md` | **BỎ sau khi đo (2026-08-27).** `dynamic()` làm trang chủ nặng thêm 3,9 KB gzip và không gỡ được gì — Server Component vốn đã chỉ ship Client Component được render. Không giữ thay đổi source nào | 01 |
| 05 | `phase-05-hydration-418.md` | Truy và sửa hydration mismatch trên trang chủ | — |
| 06 | `phase-06-measure.md` | Build lại, đo lại, ghi bảng so sánh trước/sau vào plan folder | 01–05 |

DAG: 01 chặn 04 (phải cắt icon trước thì mới đo được `dynamic()` có tác dụng thật hay không). 02, 03, 05 độc lập hoàn toàn. 06 chạy cuối.

**Mục tiêu số của phase 01 đã có bằng chứng thực nghiệm**, không còn là dự đoán: 720.691 B → 525.053 B gzip trên trang chủ, tức **−195 KB (−27%)**, và số chunk trong `.next/static/chunks/` từ ~6.000 xuống 95. Đo bằng build probe ngày 2026-08-27 với `TablerIcon` bị vô hiệu hoá tạm; phase 01 phải đạt lại đúng con số này bằng registry thật.

---

## 6. Ràng buộc kỹ thuật cần nhớ khi thi công

- ~~**Cây làm việc đang bẩn.**~~ Đã xử lý: các thay đổi `NEXT_BUILD_CPUS` / Docker được commit ở `3f57eb9` trước khi task này bắt đầu. Nhánh làm việc: `opt/resource`.
- **`experimental` trong `next.config.ts` là spread có điều kiện** (`...(buildCpus ? { experimental: {...} } : {})`). Đừng thêm gì vào `experimental` mà không xử lý cái spread này. Phase 02 chỉ thêm `images.deviceSizes` — key top-level, không đụng tới.
- **Kiểm tra chunk phải lọc theo trang chủ, không quét cả `.next/static/chunks/`.** Chunk chứa cả icon set vẫn tồn tại hợp lệ trong bundle admin (`IconPickerField` dùng `import * as TablerIcons`). Tiêu chí đúng là: lấy danh sách chunk từ HTML trang chủ rồi mới đối chiếu. Lần chạy đầu ngày 2026-08-27 suýt báo động nhầm vì quét cả thư mục.
- **Dừng `pnpm start` chạy nền không giết được server** — process vẫn giữ cổng và khoá `.next`, làm build sau đó vỡ với `EBUSY: rmdir '.next/static/chunks'`. Phải kill theo PID của listener trên cổng đó trước khi build lại.
- **Block component không tự gọi `getPayload()`** — ranh giới do plan `260825-1411` thiết lập, task này không được phá.
- **Nhánh `draft === true` luôn bypass cache** — ràng buộc từ plan cũ, task này không đụng tới query nên chỉ cần không làm hỏng.

---

## 7. Phạm vi

**In scope**
- `next.config.ts` — chỉ chỉnh `images.deviceSizes` (phase 02)
- `src/components/Media/ImageMedia/index.tsx` — sửa hàm sinh `sizes`
- 15 chỗ gọi `<Media>` chưa truyền `size` (liệt kê đủ trong phase 03)
- `src/components/Logo/Logo.tsx`, `src/Header/Component.tsx`, `src/Footer/Component.tsx`
- `src/components/TablerIcon/index.tsx` + registry mới, `src/fields/IconPicker/IconPickerField.tsx`
- `src/heros/RenderHero.tsx`, `src/blocks/RenderBlocks.tsx` — chuyển sang `dynamic()`
- File/component gây hydration mismatch (chưa xác định — phase 06 sẽ chốt và cập nhật lại bảng này)

**Out of scope** — cố tình không làm:
- Không chuyển route sang ISR / static (đã chốt ở §4)
- Không gỡ hay thay framer-motion, @heroui, lenis
- Không gỡ `lucide-react` hay dep chết khác
- Không đụng `payload.config.ts`, không đổi schema/field
- Không đụng `src/mcp/`, `src/oauth/`, `src/endpoints/`, `src/app/(payload)/`
- Không nén lại / thay file logo trên GCS (cần editor upload — sẽ đề xuất riêng sau khi đo)
- Không sửa 2 lỗi accessibility còn lại (contrast, thiếu landmark `<main>`) — khác nhóm vấn đề, task riêng
- Không viết test mới; repo chưa có test cho các file này

---

## 8. Điểm cần bạn xác nhận trước phase 01

`TablerIcon` render icon theo tên do editor chọn từ IconPicker, mà picker hiện cho chọn cả 6.090 icon. Muốn bỏ glob dynamic import thì tập icon phải hữu hạn và biết trước lúc build. Đề xuất: quét DB lấy các giá trị `icon` đang thực sự được lưu, gộp với một bộ mặc định, sinh ra registry tĩnh; picker chỉ hiển thị các icon trong registry.

Đánh đổi: editor mất khả năng chọn icon tuỳ ý ngoài registry. Thêm icon mới thành thao tác sửa code (một dòng). Nếu bạn muốn giữ nguyên quyền chọn tự do thì phải chấp nhận manifest 123 KB, hoặc đổi hướng sang render icon thành SVG inline phía server — hướng đó là task lớn hơn.

---

## 9. Rủi ro

- ~~**`modularizeImports` không tương thích Turbopack như kỳ vọng.**~~ **Rủi ro này đã xảy ra và đã xử lý (2026-08-27).** Transform chạy đúng nhưng vô dụng; phương án bị huỷ, phase viết lại. Xem §3.1. Bài học giữ lại: acceptance criterion phải là **con số đo được sau build**, không phải "build chạy được" — chính tiêu chí đó bắt được vấn đề ngay lần build đầu.
- **Đo trên local không so thẳng được với baseline production.** Bảng §3.1 đo trên `pnpm start` ở máy dev với DB khác, HTML 41 KB thay vì 72 KB. Các con số JS *so với nhau* thì hợp lệ (cùng máy, cùng cách đo), nhưng không được ghép trực tiếp vào bảng PSI. Giảm thiểu: phase 06 đo lại trên production sau khi deploy.
- **Registry icon làm mất icon đang hiển thị trên site.** Nếu quét DB sót một giá trị, icon đó biến mất im lặng (`TablerIcon` trả `null`). Giảm thiểu: acceptance criteria phase 02 bắt buộc so khớp danh sách quét được với registry và log ra tên nào không khớp.
- **Truyền `size` sai làm ảnh mờ trên màn hình lớn.** Đặt `sizes` quá nhỏ thì browser tải bản thiếu độ phân giải. Giảm thiểu: mỗi call site trong phase 03 ghi rõ chiều rộng thật đo được trên DOM; kiểm tra tay ở 1440px và 390px trước khi commit.
- **`dynamic()` cho block gây nháy nội dung.** Block dưới màn hình đầu nạp trễ có thể thấy khoảng trống khi cuộn nhanh. Giảm thiểu: giữ `ssr: true` để HTML vẫn có nội dung, chỉ hoãn phần JS hydrate.
- **Hydration #418 có thể phình phase 06.** Chưa biết component nào. Nếu truy ra nguyên nhân nằm ngoài phạm vi (ví dụ trong `@heroui` hay `next-intl`), phase 06 dừng lại, ghi lại phát hiện và chuyển thành task riêng thay vì cố sửa.
- **Cây làm việc bẩn làm commit lẫn lộn.** Xem §6. Giảm thiểu: xử lý trước khi bắt đầu phase 01.

---

**Kết quả cuối:** [results.md](results.md)
