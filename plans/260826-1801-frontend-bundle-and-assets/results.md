# Kết quả — task cắt bundle JS và asset thừa

**Ngày:** 2026-08-27
**Nhánh:** `opt/resource`
**Commit:** `c3bb2cb` → `3ae4188` (5 commit)

> **CHƯA DEPLOY.** Mọi số ở §1 đo trên local. Bảng đối chiếu với PageSpeed ở §2 **chưa điền được** — phải deploy rồi mới đo lại được trên cùng môi trường với baseline. Đây là phần còn thiếu duy nhất của task.

---

## 1. Đo được trên local

Standalone server chạy đúng cách (`phase-03-logo-cls.md` §9), trang chủ `/en`.

| Hạng mục | Trước | Sau | Δ |
|---|---|---|---|
| Tổng JS gzip trang chủ | 720.691 B | **528.683 B** | **−192.008 B (−26,6%)** |
| Số chunk trên trang chủ | 26 | **25** | −1 |
| Chunk trong `.next/static/chunks/` | ~6.000 | **96** | −98,4% |
| Chunk chứa cả icon set | 2 | **0** | |
| Request ảnh ở `w=3840` | 14/16 | **0** | |
| Logo (bản 384px) | 508.694 B PNG | **14.580 B** WebP | **−97,1%** |
| Call site `<Media>` có `size` | 5/20 | **20/20** | |
| Tỉ lệ ô dành sẵn cho logo | 5,676 (sai) | **2,428** (= ảnh thật) | |
| Hydration mismatch theo timezone | có | **0** ở UTC+14/−11/+7 | |

**Phase 01 chiếm gần như toàn bộ phần cắt được.** Ba phase còn lại sửa những thứ không hiện lên ở con số tổng JS: kích thước ảnh, layout shift, và hydration.

---

## 2. Đối chiếu với PageSpeed — CHƯA ĐO ĐƯỢC

| Hạng mục | Baseline (2026-08-26) | Sau task | Δ |
|---|---|---|---|
| Perf mobile / desktop | 54 / 63 | *(chờ deploy)* | |
| LCP mobile / desktop | 8,9 s / 2,5 s | *(chờ deploy)* | |
| TBT mobile / desktop | 370 ms / 180 ms | *(chờ deploy)* | |
| CLS mobile / desktop | 0,052 / **0,254** | *(chờ deploy)* | |

Cách đo lại: `phase-06-measure.md` §2.

---

## 3. Tiêu chí còn treo

| Tiêu chí | Phase | Vì sao chưa xong |
|---|---|---|
| CLS thực nghiệm < 0,1 | 03 | Chỉ có bằng chứng cấu trúc (tỉ lệ ô dành sẵn khớp ảnh thật). Chưa chạy `PerformanceObserver` trên trang có nội dung thật |
| Tổng byte ảnh giảm ≥50% | 02 | Cần trang production có ảnh; DB local không có nội dung trang chủ |
| Nhìn tay ở 390px / 1440px | 02, 03 | Chưa so ảnh chụp cạnh nhau |
| `/en`, `/vi`, `/en/posts` hết #418 | 05 | Đã chứng minh ở local qua 3 timezone kèm đối chứng; chưa xác nhận trên production |
| IconPicker trong admin | 01 | Cần đăng nhập admin — mình không nhập credential |
| `pnpm lint` | tất cả | ESLint hỏng sẵn ở cấp config, xem §4 |

---

## 4. Vấn đề có sẵn, phát hiện trong lúc làm, KHÔNG sửa

1. **`pnpm lint` hỏng hoàn toàn.** ESLint 9.39.4 crash `Converting circular structure to JSON` khi nạp config, trước khi đọc file nào. Kiểm bằng cách lint một file không đụng tới — crash y hệt. Nghĩa là suốt task này không có tiêu chí lint nào kiểm được.

2. **`pnpm start` không dùng được với `output: 'standalone'`.** Next cảnh báo ngay lúc khởi động. Server chạy nhưng không render nội dung. Đã làm hỏng các phép đo phase 01–02 trước khi phát hiện; số liệu đã kiểm chéo lại và vẫn dùng được, nhưng script/tài liệu nào còn hướng dẫn `pnpm start` thì nên sửa.

3. **`tsc --noEmit` có sẵn một lỗi**: `tests/int/mcp-server.int.spec.ts:35` — `'result.content' is of type 'unknown'`.

4. **`service-account.json` không có trong `.next/standalone`** — chỉ ảnh hưởng chạy standalone ở local. Đã kiểm và **production không bị**: Dockerfile cố ý không copy file này, còn `docker-compose.yml` cấp credential qua `GCS_CREDENTIALS` (base64). Mình có nghi ngờ đây là bug production và đã kiểm chứng — không phải. Chỉ cần nhớ copy file khi chạy standalone ở máy.

---

## 5. Còn lại gì — đề xuất task tiếp theo

Xếp theo mức độ đáng làm:

1. **Điều tra `opacity:0` (ưu tiên cao nhất).** HTML server-render của production có **85 element mang `opacity:0` inline** vì framer-motion SSR ra trạng thái `initial`. Nội dung có trong HTML nhưng vô hình cho tới khi hydrate xong. Nếu LCP mobile 8,9 s bị chặn bởi hydrate chứ không phải bởi ảnh thì đây là đòn bẩy lớn hơn tất cả những gì task này đã làm. Chi tiết: `phase-04-lazy-blocks.md` §5.

2. **Sửa `pnpm lint`.** Đang che mù mọi kiểm tra chất lượng.

3. ~~Kiểm Dockerfile copy `service-account.json`~~ — đã kiểm, không phải vấn đề. Xem §4.4.

4. **HTML vẫn `no-store`, TTFB ~0,68 s.** Cố ý hoãn ở `plan.md` §4 — chuyển ISR đụng luồng draft/live-preview.

5. **Hai lỗi accessibility**: contrast không đủ, thiếu landmark `<main>`. Điểm a11y đang 95.

6. **File logo gốc trên GCS vẫn 508 KB.** Optimizer đang che đi, nhưng thay bằng file nhẹ hơn sẽ giảm tải cho sharp.

7. **`lucide-react` là dependency chết** — 0 chỗ import trong `src/`. Gỡ được nhưng không ảnh hưởng tốc độ.

8. **PolicyTabs + iconRegistry (~9–12 KB gzip) bị Turbopack gom vào shared chunk của trang chủ** dù trang chủ không render chúng. `dynamic()` không sửa được, xem `phase-04-lazy-blocks.md` §4.

---

## 6. Điều đã làm sai trong quá trình, ghi lại để lần sau tránh

- **Phase `modularizeImports` bị huỷ sau khi đo**: chẩn đoán ban đầu đổ lỗi cho namespace re-export trong barrel của Tabler. Sai. Nguyên nhân thật là glob dynamic import. Cứu được nhờ acceptance criterion đòi **con số sau build** thay vì "build chạy được".
- **Phase 04 bị bỏ sau khi đo**: giả định "import tĩnh trong Server Component tốn byte" là sai — Next vốn chỉ ship Client Component được render. `dynamic()` làm nặng thêm 3,9 KB.
- **Đo trên máy sai**: các phép đo browser ban đầu chạy trên một máy macOS khác chứ không phải máy của người dùng. Đáng lẽ phải gọi `list_connected_browsers` và hỏi trước khi đụng vào browser lần đầu.

Điểm chung của cả ba: chỗ nào cũng có một phép đo hoặc một câu hỏi rẻ tiền có thể chặn sai lầm từ đầu.
