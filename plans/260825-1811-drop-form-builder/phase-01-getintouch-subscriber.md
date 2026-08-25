# Phase 01 — Get In Touch đưa người gửi vào danh sách nhận tin

**Goal:** Gửi form Get In Touch tạo bản ghi ở `contactSubmissions` **và** `subscribers`. Chạy trước khi gỡ form-builder để không có khoảng đứt nguồn subscriber.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/utilities/email/upsertSubscriber.ts` | MODIFY — thêm `'contact'` vào union `source` |
| `src/collections/Subscribers/index.ts` | MODIFY — thêm option `Contact Form` |
| `src/actions/submitContact.ts` | MODIFY — gọi `upsertSubscriber` sau khi lưu liên hệ |
| `src/actions/subscribeNewsletter.ts` | DELETE — code chết |

## 2. `submitContact` đổi gì

Sau khi `payload.create` vào `contactSubmissions` thành công, gọi thêm:

```ts
await upsertSubscriber({ email, name, source: 'contact', req })
```

Hai điều bắt buộc:

- **Không để lỗi subscriber làm hỏng việc gửi liên hệ.** Bọc `try/catch` riêng — người dùng đã viết xong tin nhắn, không thể vì lỗi phụ mà báo họ gửi thất bại. Cùng cách `syncFormSubscriber` đang làm.
- **`submitContact` là server action, không có `req` của Payload.** `upsertSubscriber` yêu cầu `req: PayloadRequest`. Phải kiểm tra khi vào code: hoặc nới kiểu để nhận `payload` trực tiếp, hoặc dựng một req tối thiểu. Không đoán — đọc chữ ký thật rồi quyết.

## 3. Không đăng ký lại người đã hủy

`upsertSubscriber` thoát sớm khi email đã tồn tại, kèm chú thích rõ là để không hồi sinh người đã bấm hủy. **Giữ nguyên.** Đây là lưới an toàn duy nhất bù cho việc tự động thêm không hỏi.

## 4. Acceptance criteria

- [ ] `pnpm generate:types`, `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] `grep -rn "subscribeNewsletter" src/` → 0 kết quả.
- [ ] Gửi form Get In Touch với email mới → xuất hiện 1 doc `contactSubmissions` **và** 1 doc `subscribers` với `source: 'contact'`, `subscribed: true`, có `unsubscribeToken`.
- [ ] Gửi lại cùng email đó → `contactSubmissions` có thêm doc, `subscribers` **không** thêm doc thứ hai.
- [ ] **Ca quan trọng nhất:** đặt một subscriber về `subscribed: false`, rồi gửi form bằng chính email đó → phải **vẫn** `subscribed: false`. Người đã hủy không bị kéo lại.
- [ ] Làm lỗi chủ động phần subscriber (vd email rỗng) → form liên hệ vẫn báo thành công, `contactSubmissions` vẫn có doc.
- [ ] Link hủy đăng ký sinh cho subscriber mới mở được và bấm được — không chỉ tồn tại trong DB.

## 5. Out of scope

- Không gỡ form-builder — phase 03.
- Không đổi UI form Get In Touch (đã chốt: không checkbox).

## 6. Commit message dự kiến

```
feat(contact): enrol Get In Touch senders as newsletter subscribers

The form-builder submission hook was the only path left that added anyone
to subscribers, and it goes away with the plugin. Get In Touch now writes
to subscribers alongside contactSubmissions so the list keeps growing.

Subscriber creation is wrapped separately from the contact write: someone
who has just typed out a message must not be told it failed because a
secondary insert did. upsertSubscriber still returns early for an address
it already knows, which keeps anyone who previously unsubscribed from
being pulled back in.

Also deletes subscribeNewsletter, a server action nothing ever imported.
```
