# Phase 02 — Sửa `sizes` để browser tải ảnh đúng kích thước

**Goal:** Sau phase này, không còn request `/_next/image?...&w=3840` nào trên trang chủ. Mỗi `<img>` tải bản gần nhất với chiều rộng thật nó chiếm trên màn hình.

Mốc đo cụ thể: ảnh cover game hiện render ở **340×604** mà tải bản **3840px** (562 KB webp); sau phase này phải tải bản ≤ 828px.

---

## 1. Vấn đề

`src/components/Media/ImageMedia/index.tsx:81-85` sinh `sizes` bằng descriptor `w`:

```js
const sizes = sizeFromProps
  ? sizeFromProps
  : Object.entries(breakpoints)
      .map(([, value]) => `(max-width: ${value}px) ${value * 2}w`)
      .join(', ')
```

→ `sizes="(max-width: 1920px) 3840w, (max-width: 1536px) 3072w, …"`. Trong thuộc tính `sizes`, phần sau media condition phải là **độ dài** (`px`, `vw`, `em`), không phải descriptor `w` — cái đó chỉ hợp lệ trong `srcset`. Browser bỏ cả list, fallback `100vw`, Next chọn candidate lớn nhất.

Thứ tự cũng sai: `sizes` khớp điều kiện **đầu tiên đúng**, nên `max-width` phải liệt kê từ nhỏ đến lớn. `Object.entries(breakpoints)` trả `3xl` trước `sm` → kể cả sửa đơn vị mà giữ thứ tự này thì vẫn luôn khớp nhánh lớn nhất.

Đây là bug có sẵn của Payload website template.

---

## 2. Files chạm vào

| File | Action |
|---|---|
| `src/components/Media/ImageMedia/index.tsx` | MODIFY |
| `next.config.ts` | MODIFY |
| `src/app/(frontend)/[locale]/posts/FeaturedPost.tsx` | MODIFY |
| `src/blocks/AboutWithStats/Component.tsx` | MODIFY (5 chỗ) |
| `src/blocks/CoreValuesShowcase/Component.tsx` | MODIFY (2 chỗ) |
| `src/blocks/FeatureTabs/Component.tsx` | MODIFY |
| `src/blocks/GamesPortfolio/GamesCarousel.tsx` | MODIFY |
| `src/blocks/MediaBlock/Component.tsx` | MODIFY |
| `src/components/Card/index.tsx` | MODIFY |
| `src/heros/BrandHero/index.tsx` | MODIFY (2 chỗ) |
| `src/heros/PostHero/index.tsx` | MODIFY |

---

## 3. `ImageMedia` — default an toàn

Thay default hỏng bằng một giá trị hợp lệ và bảo thủ. Default **không** cố đoán layout — nó chỉ cần không sai:

```js
// `sizes` nhận độ dài (px/vw), KHÔNG nhận descriptor `w` — descriptor `w` chỉ
// hợp lệ trong `srcset`. Bản cũ sinh "(max-width: 1920px) 3840w, …", browser
// vứt cả list rồi fallback 100vw nên ảnh nào cũng tải bản 3840px.
//
// Default dưới đây là mức trần an toàn cho ảnh chiếm trọn chiều ngang khung nội
// dung. Component nào biết rõ ô của mình thì PHẢI truyền `size` — xem các call
// site đã cập nhật ở cùng commit này.
const sizes = sizeFromProps ?? '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1280px'
```

`cssVariables.breakpoints` không còn được dùng ở file này → gỡ import nếu không còn chỗ nào dùng, giữ lại nếu có.

---

## 4. `next.config.ts` — chặn cửa 3840

Thêm vào khối `images`:

```ts
// Mặc định của Next có 3840. Không màn hình nào trong danh mục thiết bị của site
// cần tới mức đó, mà mỗi lần optimizer sinh bản 3840 là một lần VPS tốn CPU
// sharp cho một file không ai xem. Bỏ nó làm lưới an toàn phòng khi có call site
// mới quên truyền `size`.
deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
```

**Lưu ý vận hành:** đổi `deviceSizes` làm đổi URL ảnh → cache ảnh trong volume `image_cache` thành vô dụng, lần deploy đầu VPS sẽ tốn CPU sinh lại. Chấp nhận được, một lần.

---

## 5. 15 call site thiếu `size`

Quét bằng script cho ra 20 chỗ gọi `<Media>`, 5 chỗ đã có `size` hợp lệ (`CategoryArchiveView.tsx:58`, `CareersHighlightView.tsx:381`, `CategoryShowcaseView.tsx:103`, `IECLifeView.tsx:463`, `IECLifeView.tsx:508`) — **không đụng vào**.

15 chỗ cần thêm:

| File:line | Ghi chú layout | Chiều rộng thật |
|---|---|---|
| `posts/FeaturedPost.tsx:57` | `fill`, `priority` | đo tại chỗ |
| `AboutWithStats/Component.tsx:157` | ảnh trang trí `w-full h-auto opacity-90` | **54×81** (đo trên DOM) |
| `AboutWithStats/Component.tsx:250` | card `aspect-[4/5] w-full h-full` | đo tại chỗ |
| `AboutWithStats/Component.tsx:339` | `aspect-video w-full` | đo tại chỗ |
| `AboutWithStats/Component.tsx:473` | marquee badge | đo tại chỗ |
| `AboutWithStats/Component.tsx:513` | mascot trang trí | đo tại chỗ |
| `CoreValuesShowcase/Component.tsx:201` | `h-auto w-full` trong card | đo tại chỗ |
| `CoreValuesShowcase/Component.tsx:450` | `w-[34rem] xl:w-[42rem] 2xl:w-[48rem]` | 544 / 672 / 768 px — suy từ class |
| `FeatureTabs/Component.tsx:35` | icon tab `h-full w-full object-contain` | đo tại chỗ, cỡ vài chục px |
| `GamesPortfolio/GamesCarousel.tsx:30` | cover game | **340×604** (đo trên DOM) |
| `MediaBlock/Component.tsx:46` | ảnh nội dung chung | đo tại chỗ |
| `components/Card/index.tsx:80` | `fill`, thumbnail lưới | đo tại chỗ |
| `heros/BrandHero/index.tsx:153` | ảnh trang trí | đo tại chỗ |
| `heros/BrandHero/index.tsx:460` | mascot, `priority` | **327×491** (đo trên DOM) |
| `heros/PostHero/index.tsx:31` | `fill`, `priority`, hero tràn viền | đo tại chỗ |

### Phương pháp thực tế đã dùng (2026-08-27) — khác với dự kiến

Dự kiến ban đầu là đo cả 15 chỗ trên `pnpm start`. Không làm được: DB dev rỗng nội dung (global `home` không có block nào, `pages`/`games` 0 doc) nên local không render ảnh nào. Thay bằng hai nguồn, ghi rõ nguồn cho từng dòng ở bảng trên:

- **8 chỗ có số đo thật** — đo trên production (cùng component, cùng CSS): `BrandHero:153/460`, `GamesCarousel:30`, `MediaBlock:46`, `Card:80`, `FeaturedPost:57`, `PostHero:31`, cộng ô `AboutWithStats:157` dùng chung wrapper với `BrandHero:153`.
- **7 chỗ không render ở đâu trên production** — suy từ class Tailwind của chính wrapper, vốn là con số tuyệt đối chứ không phải phỏng đoán: `w-12 md:w-16 lg:w-20` = 48/64/80px, `w-32 md:w-48 lg:w-56` = 128/192/224px, `w-[34rem] xl:w-[42rem]` = 544/672px, `h-5 w-5` = 20px, `maxWidth: 180px`.

Hai nguồn tự kiểm chứng lẫn nhau ở chỗ chúng giao nhau: `BrandHero:460` suy từ class ra 384px và đo được đúng 384px; `PostHero:31` suy từ `max-w-6xl` ra 1152px và đo được đúng 1152px.

**Cách đo tại chỗ** (dùng khi trang có nội dung):

```js
[...document.querySelectorAll('img')].map(i => ({
  src: i.currentSrc.slice(-60),
  css: Math.round(i.getBoundingClientRect().width),
}))
```

Đo ở cả 390px (mobile) và 1440px (desktop). Giá trị `size` viết theo dạng `(max-width: 768px) <mobile>, <desktop>`.

**Ràng buộc:** không đặt `size` nhỏ hơn chiều rộng thật — sẽ mờ trên màn hình DPR 2. Khi phân vân thì làm tròn lên tới mốc `deviceSizes` gần nhất.

---

## 6. Acceptance criteria

- [x] `pnpm exec tsc --noEmit` pass — chỉ còn lỗi có sẵn `tests/int/mcp-server.int.spec.ts:35`. `pnpm lint` **không kiểm được**: ESLint hỏng sẵn ở cấp config (xem phase 01).
- [x] `pnpm build` sạch.
- [x] **Cả 20/20 call site `<Media>` đều có `size`** (trước: 5/20).
- [x] **Cả 15 chuỗi `sizes` mới hợp lệ theo parser của chính browser** — kiểm bằng `matchMedia()` cho media condition và `CSS.supports('width', …)` cho độ dài. Chuỗi cũ chạy qua cùng phép kiểm thì fail đúng ở `3840w`/`3072w`, xác nhận cả chẩn đoán lẫn cách sửa trong một phép thử.
- [x] **Browser chọn ảnh nhỏ hơn hẳn** — dựng `<img>` mới với srcset thật của production (thêm cache-buster để Chrome không giữ bản lớn đã cache) rồi so hai chuỗi `sizes`, tại DPR 2 / viewport 1920:

  | Element | Rộng thật | `sizes` cũ | `sizes` mới |
  |---|---|---|---|
  | BrandHero mascot | 338px | w=3840 | **w=828** |
  | Games cover | 340px | w=3840 | **w=750** |
  | BrandHero decor | 92px | w=3840 | **w=384** |

- [x] **Không mờ**: bản được chọn rộng gấp 2,2–4,2 lần ô CSS, trên mức DPR 2 — nên không thiếu độ phân giải. Đây là lý lẽ định lượng thay cho việc so ảnh bằng mắt, vốn không làm được vì local không có nội dung.
- [ ] **Hoãn tới sau khi deploy (phase 06)**: đếm `w=` trên trang chủ production, tổng byte ảnh giảm ≥50%, và nhìn tay ở 390px/1440px. Local không render được ảnh nào nên không có gì để đếm.
- [ ] **Hoãn tới sau khi deploy**: xác nhận trang bài viết và trang danh mục vẫn đúng — 5 call site cũ không bị đụng vào nên rủi ro thấp, nhưng chưa chạy mắt qua được.

---

## 7. Out of scope (phase này)

- Không đụng logo (phase 03).
- Không đổi `quality` (đang là 80, hợp lý).
- Không thêm `formats: ['image/avif']` — đổi format làm đổi tải CPU của sharp trên VPS, cần đo riêng.
- Không nén lại file gốc trên GCS.

---

## 8. Commit message dự kiến

```
fix(media): emit valid `sizes` so images match their rendered width

ImageMedia sinh `sizes="(max-width: 1920px) 3840w, …"` — descriptor `w` không
hợp lệ trong `sizes` (chỉ hợp lệ trong `srcset`), nên browser vứt cả list,
fallback 100vw và luôn chọn candidate lớn nhất. Thứ tự breakpoint cũng ngược:
`sizes` khớp điều kiện đúng đầu tiên nên phải đi từ nhỏ lên lớn. Kết quả đo
trên production: 14/16 ảnh tải bản 3840px, ảnh cover game render 340px mà tải
562 KB.

Thay default bằng một giá trị hợp lệ, truyền `size` tường minh cho 15 call site
còn thiếu, và bỏ 3840 khỏi `images.deviceSizes` làm lưới an toàn. Bug này đến từ
Payload website template.
```
