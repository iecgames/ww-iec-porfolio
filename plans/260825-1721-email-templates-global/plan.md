# Email thông báo: template cấu hình một lần, campaign thành nhật ký

**Date:** 2026-08-25 17:21 (Asia/Ho_Chi_Minh)
**Scope:** `src/utilities/email/`, `src/collections/EmailCampaigns/`, `src/EmailTemplates/`, `src/endpoints/`, `src/payload.config.ts`
**Trigger:** Link trong email đang trỏ về localhost. Đồng thời luồng campaign thủ công là ngõ cụt — Create New không gửi được — nên bỏ hẳn, chuyển việc customize sang một nơi cấu hình dùng lại được cho thư "new post" và "new job".

## 1. Goal

Link trong email trỏ đúng domain thật, gồm cả link hủy đăng ký. Editor cấu hình **subject + nội dung** cho hai loại thư thông báo tại một chỗ duy nhất, dùng cho mọi lần gửi về sau. Không còn tạo campaign bằng tay. `email-campaigns` trở thành nhật ký chỉ đọc ghi lại đã gửi gì, cho ai, lúc nào.

## 2. Kiểm chứng (Phase A1) — đã đọc code, không suy đoán

| Sự thật | Bằng chứng |
|---|---|
| `SITE_URL` không tồn tại | `.env` thật: chưa đặt. Không có trong `.env.example` lẫn `docker-compose.yml`. Repo dùng `NEXT_PUBLIC_SERVER_URL` |
| Mọi link email rơi về localhost | `sendCampaign.ts:52` và `getUnsubscribeUrl.ts:2` đều `process.env.SITE_URL ?? 'http://localhost:3000'` |
| Đã có helper đúng chuẩn | `src/utilities/getURL.ts` → `getServerSideURL()` |
| Create New là ngõ cụt | `SendButton.tsx:12` return null khi `status !== 'draft'`; dòng 18 báo lỗi khi chưa có `id` |
| Thông báo tự gửi ngay, không dừng ở draft | `notifySubscribers.ts` gọi `payload.create` rồi `sendCampaign` liền |
| `previewText` là field chết | Khai báo ở `EmailCampaigns/index.ts:47`, `baseTemplate` nhận tham số, nhưng `sendCampaign` không truyền |
| `logoUrl` cũng vậy | `base.ts:6` nhận, không call site nào truyền → header luôn là chữ "IEC" |
| `{{post.excerpt}}` luôn rỗng | `grep -c excerpt src/collections/Posts/index.ts` → **0**. Posts không có field này |
| `{{subscriber.name}}` không chạy ở manual | Thay token chỉ nằm trong nhánh `new_job`/`new_post` của `sendCampaign` |

### Ngữ nghĩa `email-campaigns` sau thay đổi

Hiện tại một doc = "một chiến dịch cần soạn rồi gửi". Sau thay đổi một doc = **"một lần đã gửi"** — bản ghi lịch sử do hệ thống tạo, người dùng không tạo và không sửa. Đây là thay đổi ngữ nghĩa cốt lõi của task, mọi quyết định về access và field đều bám theo nó.

## 3. Quyết định đã chốt (Q&A vòng 1)

| Câu hỏi | Lựa chọn |
|---|---|
| Nơi customize subject + nội dung | **Global `email-templates`** — cấu hình một lần cho `new post` và `new job` |
| Thời điểm gửi | **Giữ tự động** như hiện tại. Không chuyển sang duyệt tay |
| Campaign thủ công | **Bỏ hẳn** — gỡ type `manual`, `manualTemplate`, Create New |
| `email-campaigns` | Thành **nhật ký chỉ đọc** |
| Sửa thêm | `previewText`, logo trong header, gỡ token `{{post.excerpt}}` |

## 4. Phase breakdown

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | `phase-01-site-url.md` | Link email trỏ đúng domain, gồm link hủy đăng ký | — |
| 02 | `phase-02-templates-global.md` | Global `email-templates` + `sendCampaign` dùng nó; previewText, logo, bỏ excerpt | — |
| 03 | `phase-03-campaign-log.md` | Khóa `email-campaigns` thành log; xóa manual, SendButton, endpoint | 02 |

01 độc lập, sửa được và ship riêng. 03 phải sau 02 vì 02 chuyển nguồn nội dung sang global trước khi 03 gỡ field cũ đi.

## 5. Phạm vi

**In scope**
- `src/utilities/email/{sendCampaign.ts,getUnsubscribeUrl.ts}`
- `src/utilities/email/templates/{base.ts,newPost.ts,newJob.ts}`
- `src/utilities/email/templates/manual.ts` — XÓA
- `src/EmailTemplates/config.ts` + hook revalidate — MỚI
- `src/collections/EmailCampaigns/index.ts`
- `src/collections/EmailCampaigns/ui/SendButton.tsx` — XÓA
- `src/endpoints/sendCampaign.ts` — XÓA
- `src/payload.config.ts` — đăng ký global mới, bỏ endpoint

**Out of scope**
- **Không localize template.** `subscribers` không có field ngôn ngữ nào, nên chưa có căn cứ chọn ngôn ngữ cho từng người. Template giữ tiếng Việt như hiện tại. Đây là task riêng, cần thêm field locale vào subscriber trước.
- Không đụng luồng đăng ký / hủy đăng ký ngoài phần URL.
- Không thêm preview hay test-send (đã nêu ở phần hạn chế, nhưng không nằm trong yêu cầu lần này).
- Không đụng `ContactSubmissions`, `FormSubmissions`.
- Không đổi cơ chế gửi theo lô (BATCH_SIZE 50 / 200ms).

## 6. Rủi ro

- **Gửi nhầm email thật khi kiểm thử.** Nghiêm trọng nhất. `sendCampaign` gửi cho **toàn bộ** subscriber đang active. Giảm thiểu: mọi acceptance criteria đều kiểm bằng cách đọc HTML sinh ra hoặc dựng campaign trên DB test, **không** bấm gửi thật. Nếu buộc phải gửi thử, chỉ làm khi bảng `subscribers` chỉ còn đúng địa chỉ của mình.
- **Template rỗng làm email trống trơn.** Nếu editor để trống `body` trong global, thư gửi đi sẽ không có nội dung. Giảm thiểu: giữ `newPostTemplate`/`newJobTemplate` làm fallback khi global chưa cấu hình — hành vi y hệt hiện tại.
- **Campaign cũ có `type: 'manual'`.** Sau khi gỡ option `manual`, doc cũ mang giá trị không còn hợp lệ. Giảm thiểu: giữ `manual` trong danh sách options nhưng ẩn khỏi UI tạo mới; hoặc để yên vì collection thành readOnly. Chốt ở phase 03 sau khi đếm thực tế.
- **Bỏ endpoint `/api/send-campaign` làm hỏng thứ đang gọi nó.** Giảm thiểu: `grep` toàn repo trước khi xóa — hiện chỉ `SendButton.tsx` gọi, mà file đó cũng bị xóa cùng phase.
- **`access.update: () => false` chặn luôn `sendCampaign` cập nhật status.** Giảm thiểu: `sendCampaign` gọi `payload.update` với `overrideAccess: true` nên không bị chặn — nhưng phải kiểm bằng chạy thật, không suy đoán.
