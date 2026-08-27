# Phase 04 — Hoãn nạp JS của hero không dùng và block dưới màn hình đầu

> **KẾT QUẢ: BỎ PHASE NÀY.** Đã thi công, đo, và revert ngày 2026-08-27. `dynamic()` **không** đạt được mục tiêu và còn làm bundle to thêm. Chi tiết ở §7. Không có thay đổi source nào từ phase này được giữ lại.

**Goal (ban đầu):** trang chủ không còn tải JS của những biến thể hero mà nó không render, và JS của các block dưới màn hình đầu được hoãn lại.

**Chặn bởi:** phase 01.

---

## 1. Giả định ban đầu — hoá ra sai

`src/blocks/RenderBlocks.tsx` import tĩnh 14 block, `src/heros/RenderHero.tsx` import tĩnh mọi biến thể hero. Suy luận lúc lập plan: một trang chỉ render vài block nhưng bundle mang đủ cả 14, nên chuyển sang `next/dynamic` sẽ cắt được phần thừa.

Suy luận này bỏ qua một điều: **`RenderBlocks` và `RenderHero` đều là Server Component**. Trong App Router, Server Component import Client Component thì Next chỉ gửi chunk của những Client Component **thực sự được render**. Import tĩnh ở đó vốn đã có tính chất lazy sẵn — `dynamic()` không thêm được gì.

---

## 2. Đã thi công những gì

- `src/blocks/RenderBlocks.tsx` — cả 14 block chuyển sang `dynamic(() => import(...), { ssr: true })`.
- `src/heros/RenderHero.tsx` — hai biến thể hero chuyển sang `dynamic()`, giữ `ssr: true`.

Build sạch, `tsc --noEmit` pass. Rồi đo.

---

## 3. Số đo

Trang chủ local, standalone server chạy đúng cách (xem `phase-03-logo-cls.md` §9). DB này render `brandHero` và **0 layout block**, tức là trường hợp `dynamic()` đáng lẽ có lợi nhất.

| | Số chunk | Tổng JS gzip | Tổng raw |
|---|---|---|---|
| Import tĩnh | **25** | **528.625 B** | 1.795.843 B |
| `dynamic()` | 29 | 532.549 B | 1.801.784 B |
| Chênh | +4 | **+3.924 B** | +5.941 B |

`dynamic()` làm trang chủ **nặng thêm 3,9 KB gzip** và thêm 4 chunk.

---

## 4. Kiểm chứng bằng marker chuỗi

Tìm chuỗi đặc trưng của từng component trong các chunk **được `<script src>` tải ngay** trên trang chủ:

| Marker | Thuộc về | Tĩnh | `dynamic()` |
|---|---|---|---|
| `IEC Game - Winter Wolf` | VideoHero | **0** | **0** |
| `Policy tabs` | PolicyTabsBlock | 1 | 1 |
| `brand-linktree` | iconRegistry | 1 | 1 |
| `heart-handshake` | iconRegistry | 1 | 1 |

Hai điều đọc ra được:

1. **VideoHero vốn đã không bị ship** khi trang không render nó — đúng như §1. Không có gì để cắt.
2. **PolicyTabs và iconRegistry vẫn nằm trong chunk tải ngay ở cả hai bản.** `dynamic()` không gỡ được chúng.

`PolicyTabsBlock` là client component và chỉ reachable qua `RenderVideoHeroBlocks` ← `VideoHero`. Mà VideoHero lại không bị ship. Nên code của PolicyTabs có mặt **không phải vì reachability** — nhiều khả năng Turbopack gom nó chung shared chunk với thứ khác đang được dùng. Đó là lý do đổi cách import không thay đổi gì: vấn đề nằm ở tầng chia chunk, không nằm ở tầng import.

*Cảnh báo về phương pháp:* mình có thử thêm marker cho JobBoard và SendUsCV nhưng chọn nhầm chuỗi class Tailwind chung chung (`flex items-center gap-4 mb-6`), vốn xuất hiện ở nhiều component nên kết quả vô nghĩa. Bốn marker trong bảng trên là chuỗi đặc trưng, tin được. Đừng trích kết quả của hai marker kia.

---

## 5. Phát hiện phụ, có thể quan trọng hơn cả phase này

HTML server-render của production có **85 element mang `opacity:0` inline**. Framer-motion SSR ra trạng thái `initial`, nên nội dung **có trong HTML nhưng vô hình** cho tới khi hydrate xong.

Điều này phủ nhận một câu mình viết trong chính phase doc này lúc lập plan: *"`ssr: true` → HTML server-render vẫn có đủ nội dung → không ảnh hưởng SEO, không tạo khoảng trống khi cuộn"*. Đúng về HTML, sai về hiển thị.

Và nó khớp đáng ngờ với **LCP mobile 8,9 giây** trong baseline: nếu trang chỉ hiện ra sau khi framer-motion hydrate xong thì LCP bị chặn bởi ~720 KB JS chứ không phải bởi ảnh. Nếu đúng vậy, đây mới là nguyên nhân lớn nhất của điểm 54 và nó **không nằm trong plan hiện tại**.

Chưa kiểm chứng — cần đo LCP element và thời điểm nó hiện ra. Đề xuất thành task riêng, xem §7.

---

## 6. Vì sao không thử tiếp

Mục tiêu của phase là cắt byte. Cách làm đã đo là làm tăng byte. Các hướng còn lại đều vượt phạm vi:

- **Tách hero theo route** để `RenderHero` không tham chiếu cả hai biến thể trong một module — refactor cấu trúc, đụng `page.tsx` của nhiều route.
- **Can thiệp cách Turbopack chia chunk** — không có API ổn định, và nguyên nhân PolicyTabs bị gom chung chưa được xác định.
- **Gỡ framer-motion** — đã chốt là out of scope ở `plan.md` §4, và §5 cho thấy nó cần một task riêng có đo đạc đàng hoàng.

---

## 7. Đề xuất thay thế

1. **Task điều tra `opacity:0`** (ưu tiên cao). Xác định LCP element trên mobile và thời điểm nó hiện ra. Nếu LCP thật sự bị chặn bởi hydrate thì hướng sửa là cho nội dung above-the-fold hiện ngay ở SSR (bỏ `initial={{opacity:0}}` cho hero, hoặc dùng CSS animation không cần JS), và đó là đòn bẩy lớn hơn mọi thứ còn lại trong plan này.
2. **Task chia chunk**: truy vì sao PolicyTabs/iconRegistry bị gom vào shared chunk của trang chủ. Giá trị khoảng 9–12 KB gzip — nhỏ, làm sau.

---

## 8. Files chạm vào (kết quả cuối)

Không có. Cả hai file đã revert về nguyên trạng:

| File | Action |
|---|---|
| `src/heros/RenderHero.tsx` | không đổi (đã revert) |
| `src/blocks/RenderBlocks.tsx` | không đổi (đã revert) |

---

## 9. Commit message dự kiến

```
docs(plans): drop phase 04 after measuring that dynamic() costs bytes

RenderBlocks and RenderHero are Server Components, so Next already ships only
the Client Components a page actually renders — static imports there were
lazy already. Converting them to next/dynamic added 4 chunks and 3.9 KB gzip
to the homepage and removed nothing: PolicyTabs and the icon registry stayed
in eagerly-loaded chunks either way, while VideoHero was absent in both.

Source reverted; recording the measurements so nobody retries this.
```
