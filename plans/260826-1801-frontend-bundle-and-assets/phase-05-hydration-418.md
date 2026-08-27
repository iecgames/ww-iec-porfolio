# Phase 05 — Truy và sửa hydration mismatch (React #418)

**Goal:** Console trang chủ sạch lỗi. React không phải render lại cây ở client vì HTML server và client lệch nhau.

**⚠ Phase này chưa xác định được component gây lỗi.** Bước 1 là chẩn đoán; phạm vi sửa chỉ chốt được sau đó. Nếu chẩn đoán chỉ ra nguyên nhân nằm ngoài code của repo (trong `@heroui`, `next-intl`, hay Payload), **dừng lại, ghi lại phát hiện, chuyển thành task riêng** — không cố vá.

---

## 1. Triệu chứng

Mở `https://ww-iec.haleinteractive.vn/en`, console báo:

```
Minified React error #418
https://react.dev/errors/418?args[]=text&args[]=
  at ... /_next/static/chunks/0.zvn16_8csew.js
```

`#418` = "Hydration failed because the server rendered HTML didn't match the client". Tham số `args[]=text` cho biết là mismatch ở **text node**, không phải cấu trúc thẻ.

Lighthouse cũng bắt được lỗi này ở audit "Đã ghi lỗi của trình duyệt vào bảng điều khiển" (Best Practices, đang 96 điểm).

Hệ quả về hiệu năng: React vứt HTML đã render và dựng lại cây ở client → cộng thẳng vào TBT (baseline 370 ms mobile / 180 ms desktop).

---

## 2. Bước 1 — Chẩn đoán (làm trước, chưa sửa gì)

Chạy `pnpm dev` và mở trang chủ. Bản dev không minify, React sẽ in ra thông báo đầy đủ kèm cây component và **đoạn text lệch nhau**, dạng:

```
Warning: Text content did not match. Server: "..." Client: "..."
```

Với mismatch dạng `text` và một site đa ngôn ngữ có `next-intl`, các nghi can theo thứ tự khả năng:

1. **Format ngày/giờ hoặc số** render khác nhau giữa timezone/locale của server và của browser.
2. **`new Date()` / `Date.now()`** dùng trực tiếp trong render.
3. **Giá trị đọc từ `localStorage`, `window`, hoặc cookie** dùng trong lần render đầu.
4. **Locale được suy ra khác nhau** giữa server và client (site có `NEXT_LOCALE` cookie và middleware của `next-intl`).
5. **Nội dung ngẫu nhiên** (`Math.random()`) trong key hoặc text.

Ghi lại kết luận vào phase file này trước khi sửa.

---

## 2b. Chẩn đoán — kết quả (2026-08-27)

Không tái hiện được ở local vì DB dev thiếu nội dung của production, nên chẩn đoán chạy thẳng trên production bằng Playwright (Chrome hệ thống, không cần tải browser).

**Khoanh vùng theo trang:**

| Trang | #418 |
|---|---|
| `/en`, `/vi` | **có** |
| `/en/posts` | **có** |
| `/en/career`, `/vi/career` | không |
| `/en/posts/<slug>` | không |

**Xác định chính xác text lệch:** so mảng text node của HTML server-render (fetch thô, JS tắt) với DOM sau khi hydrate xong. Mọi ngày lệch **đúng một ngày**:

| SSR | Sau hydrate |
|---|---|
| 06/04/2026 | 07/04/2026 |
| 23/03/2026 | 24/03/2026 |
| 05/03/2026 | 06/03/2026 |
| 06.04.2026 | 07.04.2026 |

**Nguyên nhân:** năm bản sao của cùng một đoạn `new Date(ts).getDate()/.getMonth()/.getFullYear()`. Các hàm này đọc timezone của **host**. Server chạy UTC, người xem ở UTC+7, nên mọi timestamp rơi vào 17:00–24:00 UTC render ra một ngày ở server và ngày kế tiếp ở browser.

Vì sao `/career` và trang bài viết sạch: chúng chỉ có ít hoặc không có ngày, và ngày ở đó không rơi vào khung giờ vượt biên. Bug tồn tại ở mọi chỗ, chỉ là không phải lúc nào cũng lộ.

---

## 3. Bước 2 — Sửa

| File | Action |
|---|---|
| `src/utilities/formatDateTime.ts` | MODIFY — viết lại, ghim timezone |
| `src/app/(frontend)/[locale]/posts/FeaturedPost.tsx` | MODIFY — bỏ `formatDateDDMMYYYY` cục bộ |
| `src/components/Card/index.tsx` | MODIFY — bỏ `formatCardDate` cục bộ |
| `src/blocks/CategoryShowcase/CategoryShowcaseView.tsx` | MODIFY — bỏ `formatPostDate` cục bộ, giữ re-export |
| `src/blocks/IECLife/IECLifeView.tsx` | MODIFY — bỏ `formatPostDate` cục bộ |

Một helper dùng `Intl.DateTimeFormat` với `timeZone: 'Asia/Ho_Chi_Minh'` cố định, ba hàm mỏng bọc ngoài để **giữ nguyên ba định dạng hiển thị đang có** (`DD.MM.YYYY`, `DD/MM/YYYY`, `MM/DD/YYYY`). Không đổi thứ gì người dùng nhìn thấy ngoài việc ngày giờ đúng.

`CategoryShowcaseView` vẫn export `formatPostDate` vì `CategoryArchiveView` import từ đó — giữ nguyên để không phải sửa lan sang file thứ sáu.

Hướng sửa theo từng nguyên nhân:
- Format ngày/số → chốt `timeZone` và `locale` tường minh, dùng cùng một giá trị ở cả hai phía.
- Giá trị chỉ có ở client → chuyển sang `useEffect`, render giá trị trung tính ở lần đầu.
- Locale lệch → sửa chỗ suy ra locale, không dùng `suppressHydrationWarning` để giấu đi.

**Không dùng `suppressHydrationWarning` như cách sửa**, trừ trường hợp giá trị *bản chất* là khác nhau giữa server và client (ví dụ timestamp hiển thị). Nó chỉ tắt cảnh báo chứ không tránh được việc React render lại.

---

## 4. Acceptance criteria

- [x] `pnpm exec tsc --noEmit` pass — chỉ lỗi có sẵn. `pnpm lint` **không kiểm được** (ESLint hỏng sẵn, xem phase 01).
- [x] **Unit: formatter độc lập timezone của host.** Chạy với `TZ=UTC` (mô phỏng server):
      `2026-04-06T17:30:00Z → 07.04.2026`, `2026-04-06T16:59:59Z → 06.04.2026`, `2026-01-18T18:00:00Z → 19.01.2026`.
      Đúng hai phía của biên ngày. Chuỗi rỗng và chuỗi hỏng trả `''` như bản cũ.
- [x] **E2E: không còn lệch text ở timezone cực đoan.** Playwright ép `timezoneId` = `Pacific/Kiritimati` (UTC+14), `Pacific/Midway` (UTC−11), `Asia/Ho_Chi_Minh` (UTC+7), so text node SSR với DOM sau hydrate trên `/en` và `/en/posts`: **0 lệch, 0 hydration error** ở cả sáu tổ hợp.
- [x] **Đối chứng: phép thử trên thật sự bắt được bug.** Revert tạm bản sửa rồi chạy lại cùng phép thử — `Pacific/Midway` cho `server: 03.06.2026` vs `client: 02.06.2026` kèm **1 hydration error**. Không có bước này thì kết quả "0 lệch" vô nghĩa.
- [x] `pnpm build` sạch.
- [ ] **Hoãn tới phase 06**: xác nhận `/en`, `/vi`, `/en/posts` trên production hết `#418`, và đo lại TBT. Nội dung production không có ở local nên chỉ kiểm được sau khi deploy.

### Cách chạy lại phép thử

Không giữ script trong repo. Dựng lại khi cần: Playwright với `chromium.launch({ channel: 'chrome' })` (dùng Chrome hệ thống, khỏi `playwright install`), lấy text node của HTML thô với `javaScriptEnabled: false` + `setContent`, so với text node của trang đã hydrate, lọc theo regex `^\d{2}[./]\d{2}[./]\d{4}$`. Lưu ý: `tsx` thêm helper `__name` vào hàm có tên nằm trong `page.evaluate` và làm vỡ nó — viết extractor không có hàm con lồng bên trong.

---

## 5. Out of scope (phase này)

- Không sửa cảnh báo console loại khác (nếu có) không liên quan hydration.
- Không refactor component chỉ vì "tiện tay đang mở file".
- Không đụng middleware của `next-intl` trừ khi chẩn đoán chỉ đích danh nó.

---

## 6. Commit message dự kiến

```
fix(hydration): <mô tả nguyên nhân thật sau khi chẩn đoán>

Trang chủ ném React #418 (text mismatch) ở production, buộc React vứt HTML đã
server-render và dựng lại cây ở client — cộng thẳng vào TBT. Nguyên nhân: <điền>.

<Cách sửa và vì sao không dùng suppressHydrationWarning.>
```
