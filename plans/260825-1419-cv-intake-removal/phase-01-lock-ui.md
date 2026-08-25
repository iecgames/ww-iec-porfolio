# Phase 01 — Khóa form nộp CV + thêm địa chỉ HR vào General

**Goal:** Không còn hồ sơ mới nào vào được hệ thống. Form vẫn hiển thị đầy đủ như cũ nhưng mọi field bị disable, nút submit biến mất, và có thông báo hướng dẫn gửi CV về email HR. Chạy TRƯỚC khi dọn dữ liệu để không có hồ sơ rơi vào giữa chừng.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/components/JobApplyModal/index.tsx` | MODIFY — disable field, ẩn submit, thêm banner thông báo |
| `src/General/config.ts` | MODIFY — thêm field `recruitmentEmail` |
| `src/blocks/SendUsCV/Component.tsx` | MODIFY — đọc `recruitmentEmail`, truyền xuống client |
| `src/blocks/SendUsCV/SendUsCVClient.tsx` | MODIFY — nhận prop, truyền vào `JobApplyModal` |
| `src/app/(frontend)/[locale]/career/[jobId]/page.tsx` | MODIFY — truyền `recruitmentEmail` vào `JobApplyModal` |
| `messages/vi.json` | MODIFY — chuỗi thông báo |
| `messages/en.json` | MODIFY — chuỗi thông báo |

## 2. Điểm mấu chốt — chỉ có MỘT form

Khảo sát cho thấy `SendUsCVClient.tsx:214` render chính `JobApplyModal`, và `career/[jobId]/page.tsx` cũng import đúng component đó. **Toàn bộ form nằm ở `src/components/JobApplyModal/index.tsx`** — khóa một chỗ là phủ cả hai điểm nộp mà user yêu cầu. Không cần sửa markup form ở hai nơi.

## 3. `src/General/config.ts` (MODIFY)

Thêm vào nhóm field liên hệ, cạnh `email` (dòng ~45):

```ts
{
  name: 'recruitmentEmail',
  type: 'email',
  defaultValue: 'hr@iecorp.vn',
  label: 'Recruitment Email',
  admin: {
    description:
      'Địa chỉ ứng viên gửi CV tới. Hiển thị trong thông báo ở form ứng tuyển.',
  },
},
```

Sau khi sửa phải chạy `pnpm generate:types`.

## 4. `src/components/JobApplyModal/index.tsx` (MODIFY)

Thay đổi, giữ nguyên toàn bộ layout/markup hiện có:

1. **Xóa import và mọi lời gọi `submitJobApplication`** (dòng 15 và dòng ~151). Server action sẽ bị xóa ở phase 03; import còn sót sẽ làm gãy build.
2. **Thêm prop** `recruitmentEmail?: string | null`, fallback hằng số `'hr@iecorp.vn'`.
3. **Banner thông báo** đặt ngay đầu `<form>` (trước field đầu tiên, dòng ~208), dùng chuỗi i18n mới. Nội dung: hệ thống tiếp nhận đang được nâng cấp, vui lòng gửi CV kèm thông tin về `<recruitmentEmail>`, kèm link `mailto:`.
4. **Disable toàn bộ field**: thêm `disabled` vào mọi `Input`, `Textarea`, và input `type="file"` (component `FileField` ~dòng 358).
5. **Bỏ nút submit** (dòng 323) — thay bằng nút `mailto:` mở sẵn hòm thư. Giữ nút đóng modal (dòng 315).
6. **Dọn state chết**: `cvFile`, `cvError`, `submitError`, `success`, `isPending`, `onFileChange`, `onSubmit` không còn dùng → xóa để `tsc` không cảnh báo. Giữ `useForm` nếu markup còn phụ thuộc `register`.
7. Đổi `<form onSubmit={...}>` thành `<div>` hoặc `<form onSubmit={(e) => e.preventDefault()}>` để Enter không submit.

Nút "Ứng tuyển" mở modal (dòng 173) **giữ nguyên** — user yêu cầu vẫn để form hiển thị.

## 5. Chuỗi i18n mới

Thêm vào `apply` trong cả hai file messages:

```json
"disabledNotice": {
  "title": "Hệ thống tiếp nhận hồ sơ đang được nâng cấp",
  "body": "Vui lòng gửi CV cùng thông tin ứng tuyển về địa chỉ {email}. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.",
  "mailButton": "Gửi CV qua email"
}
```

Bản `en.json` dịch tương ứng. Dùng placeholder `{email}` của next-intl, không nối chuỗi thủ công.

## 6. Wiring notes

- `recruitmentEmail` đi từ server → client qua prop, **không** gọi `getCachedGlobal` trong client component.
- `SendUsCV/Component.tsx` đã là server component và đã đọc global → lấy thêm `recruitmentEmail` từ đó.
- `career/[jobId]/page.tsx` là server component, đọc General qua `getCachedGlobal('general', ...)` giống Footer.
- Không xóa `src/actions/submitJobApplication.ts` ở phase này — để phase 03. Phase này chỉ cắt mọi lời gọi tới nó.

## 7. Acceptance criteria

- [ ] `pnpm generate:types` chạy xong, `recruitmentEmail` xuất hiện trong `payload-types.ts`.
- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` sạch.
- [ ] `grep -rn "submitJobApplication" src/components src/blocks` → 0 kết quả.
- [ ] Mở `/vi/career` → block SendUsCV → bấm nút ứng tuyển → modal hiện, thấy banner thông báo với đúng `hr@iecorp.vn`, tất cả field xám và không gõ được.
- [ ] Mở `/vi/career/<jobId>` → nút Ứng tuyển → modal hiện banner tương tự, field job title vẫn hiện đúng tên vị trí.
- [ ] Không còn nút submit; bấm Enter trong modal không gửi gì (kiểm tra tab Network trống).
- [ ] Bấm nút "Gửi CV qua email" → mở mail client với đúng địa chỉ.
- [ ] Đổi `recruitmentEmail` trong admin → reload → thông báo hiện địa chỉ mới.
- [ ] Kiểm tra bản `/en/...` hiển thị đúng chuỗi tiếng Anh.

## 8. Out of scope

- Không xóa server action / collection / MCP tool — phase 03.
- Không xóa dữ liệu — phase 02.
- Không đổi thiết kế modal ngoài banner và nút.

## 9. Commit message dự kiến

```
feat(career): lock the CV form and point applicants at the HR mailbox

Applications will be handled by a separate recruitment service, so the
site no longer accepts CV uploads. JobApplyModal — the single form behind
both the SendUsCV block and the job detail page — now renders every field
disabled behind a notice telling candidates to email their CV instead,
and no longer calls the submit action.

The address comes from a new recruitmentEmail field on the General global
(default hr@iecorp.vn) so HR can change it without a deploy. Removing the
action itself and the job-applications collection follows in later steps.
```
