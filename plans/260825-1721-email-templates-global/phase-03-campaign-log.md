# Phase 03 — `email-campaigns` thành nhật ký chỉ đọc

**Goal:** Không tạo được campaign bằng tay nữa. Collection chỉ còn ghi lại đã gửi gì, cho ai, lúc nào. Toàn bộ code phục vụ luồng thủ công bị xóa.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/collections/EmailCampaigns/index.ts` | MODIFY — access + field readOnly |
| `src/collections/EmailCampaigns/ui/SendButton.tsx` | DELETE |
| `src/utilities/email/templates/manual.ts` | DELETE |
| `src/endpoints/sendCampaign.ts` | DELETE |
| `src/utilities/email/sendCampaign.ts` | MODIFY — bỏ nhánh manual |
| `src/payload.config.ts` | MODIFY — bỏ đăng ký endpoint |
| `src/app/(payload)/admin/importMap.js` | REGENERATE |
| `src/payload-types.ts` | REGENERATE |

## 2. Access

```ts
access: {
  create: () => false,   // chỉ hook tạo, qua overrideAccess
  read: authenticated,
  update: () => false,
  delete: authenticated, // vẫn dọn được log cũ
}
```

`sendCampaign` gọi `payload.create`/`payload.update` với `overrideAccess: true` nên không bị chặn. **Phải kiểm bằng chạy thật**, không suy đoán — đây là rủi ro đã ghi ở plan §6.

## 3. Field

Giữ đúng những gì một bản ghi lịch sử cần, tất cả `readOnly: true`:

`name`, `type`, `subject` (subject đã gửi), `relatedJob`/`relatedPost`, `status`, `sentAt`, `recipientCount`.

Bỏ hẳn: `body`, `previewText` (nội dung nay ở global), `sendAction` (UI field trỏ tới SendButton đã xóa).

## 4. Xử lý `type: 'manual'` của doc cũ — ĐÃ ĐẾM

```
total campaigns: 3
by type: { new_job: 1, new_post: 2 }
```

**Không doc nào mang `manual`** → gỡ option sạch, không doc cũ nào hiển thị giá trị lạ.

## 5. Trước khi xóa endpoint

`grep -rn "send-campaign" src/` để chắc chỉ `SendButton.tsx` gọi. Nếu còn chỗ khác thì dừng, báo lại.

## 6. Acceptance criteria

> ⚠ Không bấm gửi thật.

- [ ] `pnpm generate:types` + `pnpm generate:importmap` chạy xong.
- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] `grep -rni "manualTemplate\|SendButton\|send-campaign" src/` → 0 kết quả.
- [ ] Admin: mở Email Campaigns → **không còn nút Create New**.
- [ ] Mở một campaign cũ → mọi field readOnly, không nút gửi.
- [ ] Xóa được một campaign cũ (delete vẫn cho phép).
- [x] **`overrideAccess` thắng `access.create/update: false`** — kiểm bằng script, không gửi mail:

  ```
  create with overrideAccess : OK
  update with overrideAccess : OK
  create without override    : REFUSED (correct)
  ```

  Nghĩa là hook vẫn tạo/cập nhật campaign bình thường, còn UI thì bị chặn. Bản ghi tạm đã xóa sau khi kiểm.
- [ ] `/api/send-campaign` trả 404 (chưa chạy — cần server).

## 7. Out of scope

- Không đụng `subscribers`.
- Không đổi thời điểm gửi — vẫn tự động khi publish.

## 8. Commit message dự kiến

```
refactor(email): reduce campaigns to a send log

Campaigns were modelled as something an editor composes and sends, but
the only working path was the automatic one: hooks created a campaign and
sent it in the same breath, while Create New could never send at all.
With content now living in the email-templates global, the collection has
no authoring role left.

It becomes a read-only record of what went out — creation and updates are
closed to the UI and happen only through the hooks' overrideAccess writes.
Deletes stay open so old rows can be cleared.

Removes the manual campaign type, its template, the send button and the
/api/send-campaign endpoint that only that button called.
```
