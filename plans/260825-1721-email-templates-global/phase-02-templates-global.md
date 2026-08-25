# Phase 02 — Global `email-templates`

**Goal:** Editor cấu hình subject + nội dung cho thư "new post" và "new job" tại một chỗ, dùng cho mọi lần gửi sau đó. Kèm sửa `previewText`, logo header, và gỡ token `{{post.excerpt}}`.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/EmailTemplates/config.ts` | CREATE — global mới |
| `src/EmailTemplates/hooks/revalidateEmailTemplates.ts` | CREATE |
| `src/utilities/email/getEmailTemplates.ts` | CREATE — reader có cache |
| `src/utilities/email/sendCampaign.ts` | MODIFY — đọc global, previewText, logo |
| `src/utilities/email/templates/base.ts` | MODIFY (nếu cần) — nhận previewText/logoUrl từ call site |
| `src/collections/EmailCampaigns/index.ts` | MODIFY — bỏ `{{post.excerpt}}` khỏi description |
| `src/payload.config.ts` | MODIFY — đăng ký global |

## 2. Shape của global

Slug `email-templates`, group `Newsletter`, `admin.group` giống EmailCampaigns.

Hai group field, cùng shape:

```ts
{
  name: 'newPost',            // và 'newJob'
  type: 'group',
  fields: [
    { name: 'subject', type: 'text' },
    { name: 'previewText', type: 'text' },
    { name: 'body', type: 'richText', editor: lexicalEditor({ ... }) },
  ],
}
```

Editor lexical dùng đúng feature set của `EmailCampaigns.body` hiện tại (Heading h2–h4, FixedToolbar, InlineToolbar, HorizontalRule) để trải nghiệm soạn thảo không đổi.

**Không localized.** `subscribers` không có field ngôn ngữ, chưa có căn cứ chọn ngôn ngữ cho từng người nhận — xem plan §5.

Token hợp lệ, ghi rõ trong `admin.description`:

| Loại | Token |
|---|---|
| newPost | `{{post.title}}`, `{{post.url}}`, `{{subscriber.name}}` |
| newJob | `{{job.title}}`, `{{job.url}}`, `{{subscriber.name}}` |

**Không có `{{post.excerpt}}`** — Posts không có field đó, token luôn rỗng. Gỡ luôn khỏi description của `EmailCampaigns.body`.

## 3. `sendCampaign` đổi gì

Thứ tự ưu tiên nội dung, từ cao xuống thấp:

1. Global `email-templates` có `body` cho đúng type → dùng nó, thay token, bọc `baseTemplate`
2. Không có → rơi về `newPostTemplate` / `newJobTemplate` như hiện tại

Giữ fallback là chủ ý: global chưa cấu hình thì hành vi y hệt hôm nay, không ai nhận email trống.

Subject tương tự: global `subject` → nếu rỗng thì `campaign.subject` → nếu rỗng thì subject mặc định của template.

Đồng thời truyền hai thứ đang bị bỏ quên vào `baseTemplate`:

- `previewText` — lấy từ global theo type
- `logoUrl` — lấy từ General global (`logo`), resolve ra URL tuyệt đối. Phải là URL tuyệt đối vì email client không hiểu đường dẫn tương đối.

## 4. Wiring notes

- Reader global đặt tại `src/utilities/email/getEmailTemplates.ts`, dùng `unstable_cache` + tag `global_email-templates`, theo đúng `getGlobals.ts`.
- Hook `revalidateEmailTemplates` bắn `revalidateTag('global_email-templates', 'max')` — 2 tham số, xem plan trước.
- **Không xóa** `manualTemplate` ở phase này — phase 03 lo, để phase này còn build được.

## 5. Acceptance criteria

> ⚠ Tuyệt đối **không bấm gửi thật**. `sendCampaign` gửi cho toàn bộ subscriber đang active.

- [ ] `pnpm generate:types`, `email-templates` xuất hiện trong `payload-types.ts`.
- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] Admin hiện global "Email Templates" trong nhóm Newsletter, hai group New Post / New Job soạn thảo được.
- [ ] Dựng HTML bằng script/REPL (không gửi): global có body → HTML chứa nội dung từ global, token đã thay đúng.
- [ ] Global để trống body → HTML rơi về template mặc định, giống hệt hiện tại.
- [ ] `previewText` xuất hiện trong HTML (khối ẩn đầu `<body>`).
- [ ] Logo: HTML chứa `<img src="https://...">` tuyệt đối, không phải chữ "IEC".
- [ ] `grep -rn "post.excerpt" src/` → chỉ còn trong template mặc định (nơi nó vô hại), không còn trong description.
- [ ] Sửa global trong admin → cache invalidate, lần dựng HTML sau lấy nội dung mới.

## 6. Out of scope

- Không xóa manual / SendButton / endpoint — phase 03.
- Không localize template.
- Không thêm preview/test-send.

## 7. Commit message dự kiến

```
feat(email): configure notification content from a global

Customising a notification meant creating a campaign by hand, but that
path could never send: the send button only renders for a saved draft, so
Create New was a dead end. Content now lives in an email-templates
global — subject, preview text and body for new post and new job — and
applies to every notification the hooks fire from then on.

Templates fall back to the built-in layouts when the global is empty, so
an unconfigured site behaves exactly as before rather than mailing blank
bodies.

Also wires up two parameters baseTemplate accepted but nobody passed:
previewText, and the logo from General Settings in place of the hardcoded
"IEC" wordmark. Drops the {{post.excerpt}} token from the field help —
Posts has no excerpt field, so it always resolved to nothing.
```
