# Phase 05 — Hoãn nạp JS của hero không dùng và block dưới màn hình đầu

**Goal:** Sau phase này, trang chủ không còn tải JS của những biến thể hero mà nó không render, và JS của các block nằm dưới màn hình đầu được hoãn lại. Mục tiêu: giảm TBT (baseline 370 ms mobile / 180 ms desktop).

**Chặn bởi:** phase 01 và 02 — phải cắt 250 KB icon trước, nếu không con số đo được ở phase này bị icon che lấp và không biết `dynamic()` có tác dụng thật hay không.

---

## 1. Vấn đề

`src/blocks/RenderBlocks.tsx:7-21` import tĩnh **14 block**. `src/heros/RenderHero.tsx` import tĩnh mọi biến thể hero. Một trang chỉ render vài block, nhưng bundle mang đủ cả 14 — cộng framer-motion, HeroUI, và mọi thứ chúng kéo theo.

Đường dẫn cụ thể đã truy được: trang chủ dùng `BrandHero`, nhưng vì `RenderHero` import tĩnh `VideoHero` → `RenderVideoHeroBlocks` → `PolicyTabsBlock` → `TablerIcon`, nên `TablerIcon` vào graph trang chủ dù không bao giờ render. Phase 02 sửa gốc của `TablerIcon`; phase này sửa đường dẫn.

---

## 2. Files chạm vào

| File | Action |
|---|---|
| `src/heros/RenderHero.tsx` | MODIFY |
| `src/blocks/RenderBlocks.tsx` | MODIFY |

Nếu phát hiện block nào cần tách thêm file để `dynamic()` hoạt động (ví dụ block đang export nhiều thứ từ một file), **dừng lại và cập nhật bảng này trước khi sửa** — theo quy tắc C4 của workflow.

---

## 3. Cách làm

Chuyển import tĩnh sang `next/dynamic` với `ssr: true`:

```ts
const IECLifeBlock = dynamic(() =>
  import('@/blocks/IECLife/Component').then((m) => ({ default: m.IECLifeBlock })),
)
```

`ssr: true` (mặc định) là bắt buộc, không được bỏ:
- HTML server-render vẫn có đủ nội dung → không ảnh hưởng SEO, không tạo khoảng trống khi cuộn.
- Chỉ phần JS hydrate bị hoãn — đúng thứ ta muốn cắt khỏi critical path.

**Không** `dynamic()` cho block nằm trên màn hình đầu. Trên trang chủ đó là hero. Hoãn hero sẽ làm LCP tệ đi chứ không tốt lên.

Xác định block nào above-the-fold bằng cách mở trang chủ ở 1440×900 và 390×844, xem block nào giao với viewport ban đầu — **đo, không đoán**, vì thứ tự block do editor sắp trong CMS.

---

## 4. Acceptance criteria

- [ ] `pnpm exec tsc --noEmit` pass, `pnpm lint` không lỗi mới.
- [ ] `pnpm build` sạch.
- [ ] Tổng byte JS initial của trang chủ giảm so với sau phase 02 (ghi lại cả hai con số vào `plan.md` §2).
- [ ] `curl -s http://localhost:3000/en | grep -c '<section\|<article'` — HTML server-render vẫn chứa đủ nội dung mọi block, không rỗng chỗ nào. Đối chiếu với bản trước phase.
- [ ] Cuộn hết trang chủ ở tốc độ bình thường: không thấy khoảng trắng nhấp nháy hay nội dung nhảy vào muộn.
- [ ] Đo lại CLS như cách ở phase 04 → không tăng so với sau phase 04.
- [ ] Trang `/en/[slug]` bất kỳ, `/en/career`, `/en/posts/[slug]` vẫn render đúng (các trang này dùng chung `RenderBlocks`).
- [ ] Live preview trong admin vẫn cập nhật được — `dynamic()` không làm hỏng luồng này.

---

## 5. Out of scope (phase này)

- Không gỡ hay thay framer-motion / HeroUI / lenis. Đã chốt ở `plan.md` §4.
- Không đổi thứ tự hay cấu trúc block.
- Không đụng `src/app/(payload)/`.

---

## 6. Commit message dự kiến

```
perf(bundle): lazy-load unused hero variants and below-the-fold blocks

RenderBlocks import tĩnh cả 14 block và RenderHero import tĩnh mọi biến thể
hero, nên mỗi trang mang JS của những thứ nó không render. Cụ thể: trang chủ
dùng BrandHero nhưng vẫn kéo VideoHero -> RenderVideoHeroBlocks ->
PolicyTabsBlock -> TablerIcon vào bundle.

Chuyển sang next/dynamic với ssr: true — HTML server-render giữ nguyên đủ nội
dung, chỉ hoãn phần hydrate. Block above-the-fold giữ import tĩnh để không làm
xấu LCP.
```
