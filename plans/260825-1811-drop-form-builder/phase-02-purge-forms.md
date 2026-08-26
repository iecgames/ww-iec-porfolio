# Phase 02 — Xóa dữ liệu `forms` và `form-submissions`

**Goal:** Hai collection của form-builder không còn document nào trong Mongo.

> ⚠ **Không hoàn tác được.**
> ⚠ **Phải chạy khi `formBuilderPlugin` VẪN CÒN trong `src/plugins/index.ts`** — gỡ trước thì Payload không còn biết hai collection này và script không truy vấn được. Đúng bài học từ script purge CV.

## 1. Files chạm vào

| File | Action |
|---|---|
| `scripts/purge-forms.ts` | CREATE — dùng một lần |
| `package.json` | MODIFY — thêm script `purge:forms` |

## 2. Thuật toán

```
1. Đếm forms và form-submissions
2. In danh sách: id + tiêu đề form / id + form liên quan của submission
3. Nếu không có --confirm → dừng (dry-run mặc định)
4. Xóa form-submissions trước, rồi forms
   (submission trỏ tới form; xóa form trước để lại submission mồ côi)
5. Đếm lại, xác nhận cả hai về 0
```

Xóa submission trước là có chủ ý, cùng lý do như vụ CV: xóa phía được tham chiếu trước sẽ làm mất đường lần ra phía tham chiếu.

## 3. Lưới an toàn

- Dry-run mặc định, `--confirm` mới xóa.
- `context: { disableRevalidate: true }` để không bắn revalidate hàng loạt.
- Chỉ đụng đúng hai collection này. Không đụng `contactSubmissions`, `subscribers`.
- Rủi ro thấp hơn vụ CV nhiều: đây là collection riêng, không lẫn dữ liệu khác như CV lẫn trong `media`.

## 3b. Kết quả chạy thật trên DB hiện tại

```
form-submissions   : 0
forms              : 0
contactSubmissions : 0  (must not change)
subscribers        : 0  (must not change)
→ Nothing to purge.
```

DB mà `.env` trỏ tới rỗng nên **không có gì để xóa ở đây**. Con số 0 không chứng minh production cũng rỗng — script phải chạy lại trên DB thật, **trước khi** phase 03 lên production.

## 4. Acceptance criteria

- [x] Dry-run chạy được, in đúng số doc của cả hai collection (0/0 trên DB này).
- [ ] Chạy `--confirm` xong không lỗi.
- [ ] Đếm lại: `forms` = 0, `form-submissions` = 0.
- [ ] `contactSubmissions` và `subscribers` **không đổi số lượng** — kiểm trước/sau.
- [ ] Admin vẫn vào được, các collection khác bình thường.

## 5. Out of scope

- Không gỡ plugin — phase 03.
- Không xóa `contactSubmissions`.

## 6. Commit message dự kiến

```
chore(forms): add one-off script to purge form-builder data

Deletes every form-submissions document, then every forms document, in
that order — a submission references its form, so removing forms first
would strand the submissions with no way left to identify them.

Dry-run by default; --confirm deletes. Must run while formBuilderPlugin
is still registered, since Payload cannot query collections its config no
longer declares.
```
