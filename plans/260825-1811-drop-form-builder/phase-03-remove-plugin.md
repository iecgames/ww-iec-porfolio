# Phase 03 — Gỡ form-builder khỏi codebase

**Goal:** Không còn plugin, không còn block "Form" trong danh sách khối, không còn dependency. Seed vẫn chạy được.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/plugins/index.ts` | MODIFY — bỏ `formBuilderPlugin` + import |
| `src/blocks/Form/` | DELETE — cả thư mục, 16 file |
| `src/blocks/RenderBlocks.tsx` | MODIFY — bỏ import + map `formBlock` |
| `src/blocks/sharedBlocks.ts` | MODIFY — bỏ `FormBlock` |
| `src/collections/FormSubmissions/` | DELETE — cả thư mục |
| `src/endpoints/seed/contact-form.ts` | DELETE |
| `src/endpoints/seed/contact-page.ts` | DELETE hoặc viết lại — xem §3 |
| `src/endpoints/seed/index.ts` | MODIFY |
| `package.json` | MODIFY — gỡ `@payloadcms/plugin-form-builder` |
| `src/payload-types.ts` | REGENERATE |
| `src/app/(payload)/admin/importMap.js` | REGENERATE |

## 2. Thứ tự an toàn

Sửa `plugins/index.ts` **sau cùng** trong phase này. Gỡ plugin trước khi dọn các nơi tham chiếu sẽ làm `tsc` sập hàng loạt và khó biết chỗ nào còn sót.

## 3. Trang contact trong seed

`seed/contact-page.ts` dựng một trang chỉ chứa đúng một `formBlock`. Bỏ form-builder thì trang này không còn nội dung gì.

**Quyết định khi vào code:** xóa hẳn cả trang contact khỏi seed. Lý do: khối thay thế hợp lý là `newsletterSignup` (Get In Touch), nhưng nó có `heading` bắt buộc và một panel thông tin liên hệ cần dữ liệu thật — dựng bừa một bản seed nửa vời còn khó hiểu hơn là không seed. Nếu người dùng muốn giữ trang contact mẫu thì làm ở task riêng.

Ghi lại quyết định thực tế vào đây sau khi thực thi.

## 4. Kiểm tra trước khi gỡ dependency

`grep -rn "plugin-form-builder" src/` phải ra 0 kết quả trước khi đụng `package.json`.

**Lưu ý về lockfile:** gỡ dependency khỏi `package.json` mà không cập nhật `pnpm-lock.yaml` sẽ làm `pnpm install --frozen-lockfile` trong `Dockerfile` **fail**, tức là hỏng deploy VPS. Phải chạy `pnpm remove @payloadcms/plugin-form-builder` chứ không sửa tay. Nếu không chạy được `pnpm` thì để nguyên `package.json` và ghi lại thành việc còn treo — đúng bài học từ phase 07 của plan tối ưu hiệu năng.

## 5. Acceptance criteria

- [ ] `grep -rni "form-builder\|formBlock\|FormBlock\|form-submissions\|syncFormSubscriber" src/` → 0 kết quả.
- [ ] `pnpm generate:types` + `pnpm generate:importmap` chạy xong.
- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] Admin: nhóm **Forms** không còn Forms / Form Submissions.
- [ ] Trong trình soạn layout của Pages/Home/Career, danh sách khối **không còn "Form"**, vẫn còn "Get In Touch".
- [ ] Nút Seed trong admin chạy xong không lỗi.
- [ ] Gửi form Get In Touch → vẫn tạo `contactSubmissions` + `subscribers` (xác nhận phase 01 không bị phá).
- [ ] `pnpm install` xong, lockfile khớp `package.json`.

## 6. Out of scope

- Không đổi slug block `newsletterSignup` (xem plan §5).
- Không đụng dữ liệu — đã xử lý ở phase 02.

## 7. Commit message dự kiến

```
refactor(forms): drop the form-builder plugin

The site carried two parallel form systems: the form-builder plugin with
its editor-defined forms, and the hand-written Get In Touch block. With
Get In Touch now feeding subscribers, the plugin has no remaining role.

Removes the plugin, the Form block and its sixteen field components, the
syncFormSubscriber hook, and the seed data that built an example contact
page from a generated form.
```
