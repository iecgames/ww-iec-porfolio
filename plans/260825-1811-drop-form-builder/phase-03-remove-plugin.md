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

**Đã thực hiện:** xóa hẳn `contact-form.ts` và `contact-page.ts`, bỏ khỏi `seed/index.ts`. Lý do giữ nguyên như dự tính — khối thay thế hợp lý là `newsletterSignup`, nhưng nó cần `heading` bắt buộc và panel thông tin liên hệ có dữ liệu thật; seed bừa còn khó hiểu hơn không seed.

Kéo theo một chỗ ngoài dự tính: header nav trong seed có mục **"Contact"** trỏ `reference` tới trang contact vừa xóa (`seed/index.ts:237`). Đã gỡ mục nav đó, nếu không seed sẽ tham chiếu một trang không tồn tại.

Cũng gỡ `'forms'` và `'form-submissions'` khỏi mảng `collections` mà seed dùng để xóa sạch trước khi ghi.

## 4. Kiểm tra trước khi gỡ dependency

`grep -rn "plugin-form-builder" src/` phải ra 0 kết quả trước khi đụng `package.json`.

**Lưu ý về lockfile:** gỡ dependency khỏi `package.json` mà không cập nhật `pnpm-lock.yaml` sẽ làm `pnpm install --frozen-lockfile` trong `Dockerfile` **fail**, tức là hỏng deploy VPS. Phải chạy `pnpm remove @payloadcms/plugin-form-builder` chứ không sửa tay. Nếu không chạy được `pnpm` thì để nguyên `package.json` và ghi lại thành việc còn treo — đúng bài học từ phase 07 của plan tối ưu hiệu năng.

## 4b. Script purge phải xóa theo — cách lấy lại

Sau khi gỡ plugin, `scripts/purge-forms.ts` không còn compile được (`TS2322`: slug `forms`/`form-submissions` không còn trong `CollectionSlug`). Đúng như đã lường ở §4 và giống hệt vụ script purge CV. Giữ file hỏng trong repo là sai nên script bị xóa.

**Lấy lại khi cần chạy trên DB thật** — script còn nguyên ở commit `bd9f582`:

```bash
git show bd9f582:scripts/purge-forms.ts > scripts/purge-forms.ts
git show bd9f582:package.json | grep purge:forms   # thêm lại dòng script
pnpm purge:forms                                    # dry-run
pnpm purge:forms -- --confirm                       # xóa thật
```

Phải chạy trên checkout **trước** commit của phase này, khi plugin còn trong config.

## 5. Acceptance criteria

- [x] `grep -rni "form-builder\|formBlock\|FormBlock\|form-submissions\|syncFormSubscriber" src/` → 0 kết quả.
- [x] `pnpm generate:types` + `pnpm generate:importmap` chạy xong.
- [x] `pnpm exec tsc --noEmit` pass (chỉ còn lỗi có sẵn ở `tests/int/mcp-server.int.spec.ts`), `pnpm build` sạch.
- [x] `pnpm remove @payloadcms/plugin-form-builder` chạy xong — cả `package.json` lẫn `pnpm-lock.yaml` đều sạch, build lại vẫn OK.
- [ ] Admin: nhóm **Forms** không còn Forms / Form Submissions (cần dựng server).
- [ ] Trình soạn layout không còn khối "Form", vẫn còn "Get In Touch" (cần dựng server).
- [ ] ~~Nút Seed chạy không lỗi~~ → **KHÔNG CHẠY, CÓ CHỦ Ý.** `seed/index.ts:52` gọi `payload.db.deleteMany` trên `categories`, `media`, `pages`, `posts` và wipe nav header/footer. Chạy nó sẽ xóa nội dung thật đang có trong DB. Seed đã qua `tsc` và `build`; muốn kiểm chạy thì phải làm trên DB dùng một lần.
- [ ] Gửi form Get In Touch → vẫn tạo `contactSubmissions` + `subscribers` (phase 01 đã kiểm ở tầng dữ liệu).

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
