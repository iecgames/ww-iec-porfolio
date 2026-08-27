# Phase 06 — Truy và sửa hydration mismatch (React #418)

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

## 3. Bước 2 — Sửa

Cập nhật bảng "Files chạm vào" dưới đây sau khi chẩn đoán xong, rồi mới sửa.

| File | Action |
|---|---|
| *(điền sau bước 1)* | |

Hướng sửa theo từng nguyên nhân:
- Format ngày/số → chốt `timeZone` và `locale` tường minh, dùng cùng một giá trị ở cả hai phía.
- Giá trị chỉ có ở client → chuyển sang `useEffect`, render giá trị trung tính ở lần đầu.
- Locale lệch → sửa chỗ suy ra locale, không dùng `suppressHydrationWarning` để giấu đi.

**Không dùng `suppressHydrationWarning` như cách sửa**, trừ trường hợp giá trị *bản chất* là khác nhau giữa server và client (ví dụ timestamp hiển thị). Nó chỉ tắt cảnh báo chứ không tránh được việc React render lại.

---

## 4. Acceptance criteria

- [ ] `pnpm dev` → console trang chủ không còn cảnh báo hydration, ở cả `/en` và `/vi`.
- [ ] `pnpm build && pnpm start` → console không còn `Minified React error #418`.
- [ ] Kiểm cả các trang khác: `/en/career`, một `/en/posts/<slug>`, một `/en/[slug]`.
- [ ] Kiểm ở hai timezone khác nhau (đổi timezone máy hoặc dùng `TZ=` khi chạy server) nếu nguyên nhân liên quan ngày giờ.
- [ ] `pnpm exec tsc --noEmit` pass, `pnpm lint` không lỗi mới.
- [ ] Đo lại TBT sau khi sửa và ghi lại — để biết phần này đóng góp bao nhiêu.

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
