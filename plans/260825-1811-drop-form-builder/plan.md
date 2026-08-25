# Bỏ form-builder, Get In Touch trở thành nguồn subscriber

**Date:** 2026-08-25 18:11 (Asia/Ho_Chi_Minh)
**Scope:** `src/plugins/`, `src/blocks/Form/`, `src/blocks/NewsletterSignup/`, `src/actions/`, `src/collections/{FormSubmissions,Subscribers}/`, `src/endpoints/seed/`, `src/utilities/email/`, `package.json`
**Trigger:** Site có hai hệ thống form song song. Bỏ form-builder, giữ một đường duy nhất: block Get In Touch nhận liên hệ và đồng thời đưa người gửi vào danh sách nhận bản tin.

## 1. Goal

Không còn plugin form-builder, không còn collection `forms`/`form-submissions`, không còn block "Form" trong danh sách khối. Người gửi form Get In Touch được lưu vào `contactSubmissions` **và** `subscribers`. Sau khi xong, `subscribers` có đúng một nguồn cấp mới.

## 2. Kiểm chứng (Phase A1) — đã đọc code

### Ngữ nghĩa `subscribers`

Một doc = "một địa chỉ email trong danh sách nhận bản tin", có `subscribed` bật/tắt và `unsubscribeToken` riêng. Hệ thống campaign gửi cho **mọi** doc `subscribed: true`.

### Đường tạo subscriber, trước và sau

| `source` | Trước | Sau |
|---|---|---|
| `form_submission` | `syncFormSubscriber` — **đường duy nhất còn sống** | ❌ mất cùng form-builder |
| `job_application` | đã xóa ở đợt gỡ CV | ❌ |
| `newsletter` | `subscribeNewsletter` chưa từng được gọi | ❌ code chết |
| `contact` | — | ✅ **đường duy nhất mới** |

**Ràng buộc thứ tự:** gỡ form-builder trước khi nối Get In Touch sẽ để lại khoảng thời gian không ai vào được danh sách. Phase 01 phải xong trước phase 03.

### Phụ thuộc form-builder

| Nơi | Dính gì |
|---|---|
| `src/plugins/index.ts:2,56` | đăng ký plugin |
| `src/blocks/Form/` | 16 file, toàn bộ UI field |
| `src/blocks/RenderBlocks.tsx:10,28` | map `formBlock` |
| `src/blocks/sharedBlocks.ts:6,36` | đưa block vào Pages/Home/Career |
| `src/collections/FormSubmissions/hooks/syncFormSubscriber.ts` | hook đẩy subscriber |
| `src/endpoints/seed/{index.ts,contact-form.ts,contact-page.ts}` | seed tạo form + trang contact dùng `formBlock` |
| `package.json` | `@payloadcms/plugin-form-builder` |

### `upsertSubscriber` hiện tại

```ts
source: 'job_application' | 'form_submission'
```

Cần thêm `'contact'`. Hàm đã có sẵn lưới an toàn quan trọng: **nếu email đã tồn tại thì không ghi đè** — nên người từng bấm hủy đăng ký sẽ không bị đăng ký lại khi họ gửi liên hệ lần nữa. Giữ nguyên hành vi này.

## 3. Quyết định đã chốt (Q&A vòng 1)

| Câu hỏi | Lựa chọn |
|---|---|
| Cơ chế đồng ý nhận tin | **Tự động thêm tất cả** — không checkbox. User đã cân nhắc và tái khẳng định sau khi được nêu rủi ro |
| Dữ liệu `forms` / `form-submissions` cũ | **Xóa hẳn khỏi Mongo**, không chỉ gỡ khỏi config |

### Ghi nhận về lựa chọn tự động thêm

Người gửi liên hệ không tỏ ý muốn nhận bản tin, nên họ sẽ nhận email marketing mà không chủ động đăng ký. Rủi ro thực tế: bị đánh dấu spam, và vướng quy định về thư quảng cáo.

Thứ bù lại rủi ro này là **link hủy đăng ký phải luôn hoạt động** — link đó vừa được sửa ở `260825-1721-email-templates-global` phase 01. Acceptance criteria của phase 01 vì vậy bắt buộc kiểm luồng hủy đăng ký, không chỉ luồng thêm.

## 4. Thứ tự phase — không đảo được

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | `phase-01-getintouch-subscriber.md` | Get In Touch ghi vào `subscribers` | — |
| 02 | `phase-02-purge-forms.md` | Script xóa `forms` + `form-submissions`, chạy khi plugin **còn** đăng ký | 01 |
| 03 | `phase-03-remove-plugin.md` | Gỡ plugin, block, seed, dependency | 02 |

Lý do: 01 dựng đường mới trước khi 03 phá đường cũ, không để đứt quãng. 02 phải chạy lúc plugin còn trong config, vì gỡ rồi thì Payload không truy vấn được hai collection đó nữa — đúng bài học từ script purge CV lần trước.

## 5. Phạm vi

**In scope**
- `src/actions/submitContact.ts` — gọi `upsertSubscriber`
- `src/utilities/email/upsertSubscriber.ts` — thêm `'contact'` vào union
- `src/collections/Subscribers/index.ts` — thêm option `contact`
- `src/actions/subscribeNewsletter.ts` — XÓA (code chết, xác nhận không nơi nào import)
- `src/plugins/index.ts`, `src/blocks/Form/`, `RenderBlocks.tsx`, `sharedBlocks.ts`
- `src/collections/FormSubmissions/` — XÓA
- `src/endpoints/seed/{index.ts,contact-form.ts,contact-page.ts}`
- `scripts/purge-forms.ts` — MỚI, dùng một lần
- `package.json`

**Out of scope**
- **Không đổi tên block `newsletterSignup`.** Tên slug sai lệch so với chức năng (label là "Get In Touch"), nhưng đổi slug làm hỏng mọi doc đã dùng block này. Là task riêng cần migration.
- Không đụng `contactSubmissions` schema — vẫn lưu liên hệ như cũ.
- Không đụng hệ thống campaign vừa làm.
- Không thêm checkbox opt-in (đã chốt).
- Không xóa các option `source` cũ khỏi Subscribers — doc cũ còn mang giá trị đó.

## 6. Rủi ro

- **Đứt nguồn subscriber giữa chừng.** Nếu phase 03 lên production trước phase 01, không ai vào được danh sách. Giảm thiểu: thứ tự phase ở §4, và deploy cả ba cùng lúc.
- **Xóa nhầm dữ liệu.** `forms`/`form-submissions` là collection riêng, không lẫn với collection khác như vụ CV lẫn trong `media` — rủi ro thấp hơn nhiều. Vẫn giữ dry-run mặc định và in danh sách trước khi xóa.
- **DB hiện tại rỗng nên không kiểm chứng được gì.** Phép đếm cho `forms 0 | form-submissions 0 | contactSubmissions 0 | subscribers 0 | pages 0`. Con số 0 **không chứng minh** production cũng rỗng. Script phải chạy lại trên DB thật.
- **Seed hỏng.** `seed/index.ts` tạo `forms` rồi truyền vào `contact-page`. Gỡ nửa vời sẽ làm nút Seed trong admin lỗi. Giảm thiểu: phase 03 sửa trọn seed, acceptance criteria bắt buộc chạy thử seed.
- **Người đã hủy đăng ký bị thêm lại.** `upsertSubscriber` bỏ qua email đã tồn tại nên không xảy ra — nhưng phải kiểm bằng chạy thật, không suy đoán.
