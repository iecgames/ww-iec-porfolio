# Phase 06 — Đo lại và ghi bảng so sánh

**Goal:** Có bằng chứng số cho toàn bộ task, không phải cảm nhận. Kết thúc phase này, `plan.md` có một bảng trước/sau đầy đủ và một kết luận rõ ràng về việc mục tiêu nào đạt, mục tiêu nào không.

**Chặn bởi:** 01–05.

---

## 1. Files chạm vào

| File | Action |
|---|---|
| `plans/260826-1801-frontend-bundle-and-assets/results.md` | CREATE |
| `plans/260826-1801-frontend-bundle-and-assets/plan.md` | MODIFY (thêm link tới results.md) |

Không sửa source code ở phase này. Nếu số đo cho thấy còn vấn đề, ghi vào `results.md` như đề xuất cho task sau — **không** tiện tay sửa.

---

## 2. Việc phải làm

### 2.1 Deploy lên môi trường đo được

Số đo local không so được với baseline production (khác CPU, khác mạng, khác latency tới GCS). Phải deploy rồi mới đo. Nếu chưa deploy được thì phase này dừng lại chờ — ghi rõ trạng thái, không đo tạm rồi ghi vào bảng như thể là kết quả thật.

### 2.2 Chạy lại PageSpeed Insights

Cùng URL với baseline: `https://ww-iec.haleinteractive.vn/en`, cả `form_factor=mobile` và `desktop`.

### 2.3 Đo lại khối lượng truyền tải

Cùng phương pháp với baseline, để so sánh có nghĩa:

```bash
# HTML
curl -s -o /dev/null --compressed -w 'html=%{size_download} ttfb=%{time_starttransfer}\n' \
  https://ww-iec.haleinteractive.vn/en

# Tổng JS gzip của các chunk trong HTML
curl -s --compressed https://ww-iec.haleinteractive.vn/en \
  | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u > /tmp/js.txt
tot=0; while read p; do
  s=$(curl -s -o /dev/null --compressed -w '%{size_download}' "https://ww-iec.haleinteractive.vn$p")
  tot=$((tot+s)); done < /tmp/js.txt
echo "chunks=$(wc -l < /tmp/js.txt) totalJsGzip=$tot"

# Phân bố kích thước ảnh
curl -s --compressed https://ww-iec.haleinteractive.vn/en | grep -o 'w=[0-9]*' | sort | uniq -c
```

### 2.4 Viết `results.md`

Bảng đối chiếu từng dòng với `plan.md` §2:

| Hạng mục | Baseline | Sau task | Δ |
|---|---|---|---|
| Perf mobile / desktop | 54 / 63 | | |
| LCP mobile / desktop | 8,9 s / 2,5 s | | |
| TBT mobile / desktop | 370 ms / 180 ms | | |
| CLS mobile / desktop | 0,052 / 0,254 | | |
| Tổng JS gzip | 721 KB | | |
| Số chunk | 26 | | |
| Logo | 508.694 B | | |
| Request `w=3840` | 14 | | |

Kèm một mục "còn lại gì" — liệt kê thẳng thắn những gì vẫn chưa tốt và thuộc về task nào sau đây. Các ứng viên đã biết trước:
- HTML vẫn `no-store`, TTFB ~0,68 s → task ISR (đã cố ý hoãn, `plan.md` §4)
- 2 lỗi accessibility: contrast và thiếu landmark `<main>`
- File logo gốc trên GCS vẫn 508 KB (chỉ được optimizer che đi, chưa thay)
- `lucide-react` là dep chết
- @heroui + @react-aria ~52 KB gzip chưa đụng tới

---

## 3. Acceptance criteria

- [ ] `results.md` tồn tại, mọi ô trong bảng có số thật, không ô nào bỏ trống hay ghi "khoảng".
- [ ] Mỗi mục tiêu số nêu trong các phase trước được đối chiếu rõ **đạt / không đạt**.
- [ ] Mục "còn lại gì" liệt kê đủ, kể cả những thứ làm task này trông kém ấn tượng hơn.
- [ ] `plan.md` có link tới `results.md`.

---

## 4. Out of scope (phase này)

- Không sửa code. Mọi phát hiện mới thành đề xuất task sau.
- Không chỉnh lại các phase trước cho khớp kết quả.

---

## 5. Commit message dự kiến

```
docs(plans): record before/after measurements for the bundle task

Đo lại trên production cùng phương pháp với baseline ngày 2026-08-26 và ghi
bảng đối chiếu vào results.md, kèm danh sách những gì còn lại và thuộc task nào.
```
