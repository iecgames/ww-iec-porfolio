# Gỡ luồng tiếp nhận CV, chuyển sang hướng dẫn gửi email

**Date:** 2026-08-25 14:19 (Asia/Ho_Chi_Minh)
**Scope:** `src/actions/`, `src/blocks/SendUsCV/`, `src/components/JobApplyModal/`, `src/collections/JobApplications/`, `src/mcp/`, `src/General/`, `src/payload.config.ts`, `next.config.ts`
**Trigger:** Hệ thống tuyển dụng riêng sẽ tiếp nhận CV, nên site không lưu trữ hồ sơ nữa. Trong lúc service mới chưa ổn định, form vẫn hiển thị nhưng khóa lại, kèm hướng dẫn ứng viên gửi CV về hòm thư HR.

## 1. Goal

Không còn bất kỳ đường nào để nộp CV vào hệ thống hiện tại: không server action, không collection, không MCP tool. Hai điểm nộp CV trên UI (block `SendUsCV` và `JobApplyModal`) vẫn hiển thị đầy đủ form nhưng mọi field bị disable, kèm thông báo hướng dẫn gửi email về địa chỉ HR đọc từ General Settings. Dữ liệu hồ sơ cũ và file CV trên GCS bị xóa.

## 2. Kiểm chứng data-model (Phase A1)

| Thực thể | Một doc được tạo khi | Một doc mang nghĩa |
|---|---|---|
| `job-applications` | Ứng viên submit form qua `submitJobApplication` | 1 lần ứng tuyển của 1 người vào 1 job (hoặc ứng tuyển mở khi `job` rỗng) |
| `media` | **Vừa** editor upload ảnh site, **vừa** ứng viên nộp CV | Một file bất kỳ — ảnh site hoặc CV, không phân biệt bằng field nào cả |
| `subscribers` | Nhiều nguồn, trong đó có hook `syncSubscriber` khi có application mới | 1 email trong danh sách nhận bản tin, có field `source` |

### Ràng buộc quan trọng nhất của task

**File CV nằm chung collection `media` với ảnh của site.** Không có field nào đánh dấu "đây là CV". Đường liên kết đáng tin duy nhất là `job-applications.cv → media.id`. `media.alt` có dạng `CV — <tên>` nhưng chỉ là dấu hiệu phụ, không được dùng làm tiêu chí xóa.

Kéo theo hai quy tắc bắt buộc, sai là mất ảnh site:

1. **Thu thập toàn bộ `cv` media id TRƯỚC khi xóa doc `job-applications`.** Xóa doc trước thì media thành mồ côi, không còn cách nào nhận diện an toàn.
2. **Gỡ collection khỏi `payload.config.ts` SAU CÙNG.** Gỡ trước thì mất luôn Local API để truy vấn và dọn dữ liệu.

## 3. Quyết định đã chốt (từ Q&A vòng 1)

| Câu hỏi | Lựa chọn |
|---|---|
| Collection `job-applications` | **Gỡ khỏi config + xóa document + xóa file CV trên GCS.** Không hoàn tác được |
| Phạm vi UI cần khóa | **Cả hai** — block `SendUsCV` và `JobApplyModal` |
| Địa chỉ HR | **Thêm field `recruitmentEmail` vào General global**, mặc định `hr@iecorp.vn`, UI fallback về hằng số nếu rỗng |
| Server action `submitJobApplication` | **Xóa hẳn file**, đồng thời bỏ `serverActions.bodySizeLimit` trong `next.config.ts` |

## 4. Điểm cần bạn xác nhận thêm (chưa chốt)

**`subscribers` sinh ra từ ứng tuyển.** Hook `syncSubscriber` đã thêm email ứng viên vào `subscribers` với `source: 'job_application'`. Xóa application **không** tự động xóa các subscriber này.

Mặc định của plan: **giữ nguyên** các subscriber đó. Lý do: đây là danh sách nhận bản tin, người dùng đã để lại email một cách chủ động, và xóa nhầm là mất dữ liệu marketing không liên quan tới việc bỏ lưu CV. Nếu bạn muốn xóa luôn thì báo trước khi chạy phase 02 — sẽ thêm vào script.

## 5. Thứ tự phase — có chủ đích, không đảo được

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | `phase-01-lock-ui.md` | Khóa 2 form + thêm `recruitmentEmail` vào General. **Chặn hồ sơ mới trước khi dọn dữ liệu** | — |
| 02 | `phase-02-purge-data.md` | Export backup, rồi xóa doc `job-applications` + media CV tương ứng. Chạy khi collection **vẫn còn** trong config | 01 |
| 03 | `phase-03-remove-code.md` | Gỡ collection khỏi config, xóa hooks/MCP tools/server action, dọn `next.config.ts` | 02 |

Lý do thứ tự này: khóa UI trước để không có hồ sơ mới rơi vào giữa lúc đang dọn; xóa dữ liệu khi Payload còn truy vấn được; gỡ code sau cùng.

## 6. Quan hệ với plan tối ưu hiệu năng

Plan `260825-1411-perf-vps-optimization` có phase 01 sửa `src/blocks/SendUsCV/Component.tsx` (chuyển sang `getCachedSocials`). Plan này viết lại phần lớn component đó.

**Đề xuất: chạy trọn plan CV này trước, rồi mới chạy plan perf.** Nếu làm ngược, phase 01 của plan perf sẽ phải sửa lại lần hai. Block `SendUsCV` sau khi khóa form vẫn hiển thị social links nên phase perf vẫn còn giá trị, chỉ là áp lên phiên bản component đã ổn định.

## 7. Phạm vi

**In scope**
- `src/blocks/SendUsCV/Component.tsx`, `SendUsCVClient.tsx`
- `src/components/JobApplyModal/index.tsx`
- `src/General/config.ts` — thêm `recruitmentEmail`
- `src/actions/submitJobApplication.ts` — xóa
- `src/collections/JobApplications/` — xóa cả thư mục
- `src/payload.config.ts` — bỏ đăng ký collection
- `src/mcp/tools/applications.ts`, `src/mcp/utils/links.ts` — gỡ phần applications
- `next.config.ts` — bỏ `experimental.serverActions.bodySizeLimit`
- `scripts/purge-job-applications.ts` — script dùng một lần, có dry-run
- `messages/en.json`, `messages/vi.json` — chuỗi thông báo mới

**Out of scope**
- Không tích hợp service CV mới (chưa ổn định — sẽ là task riêng)
- Không xóa subscriber `source: 'job_application'` (xem §4)
- Không đụng collection `jobs` — vị trí tuyển dụng vẫn đăng bình thường
- Không đụng form builder plugin / `form-submissions`
- Không gỡ `serverActions` hoàn toàn nếu còn action khác dùng — chỉ bỏ `bodySizeLimit` nếu xác nhận nó chỉ phục vụ upload CV

## 8. Rủi ro

- **Xóa nhầm ảnh site.** Rủi ro nghiêm trọng nhất. Giảm thiểu: script chạy `--dry-run` mặc định, in ra danh sách media id + `alt` + `filename` để review bằng mắt trước khi xóa thật; đối chiếu chéo `alt` bắt đầu bằng `CV — `; phase 02 có acceptance criterion đếm số ảnh site trước/sau.
- **Không hoàn tác được.** Giảm thiểu: bắt buộc export JSON toàn bộ `job-applications` (kèm media id, filename, url) ra file trước khi xóa; giữ file export ngoài repo.
- **`payload-types.ts` mất type `JobApplication`** làm hỏng import ở nơi chưa lường. Giảm thiểu: phase 03 chạy `generate:types` rồi `tsc --noEmit` để lộ hết chỗ gãy.
- **MCP tool gỡ nửa vời** làm hỏng đăng ký tool. Giảm thiểu: phase 03 kiểm tra `/api/mcp` còn liệt kê đúng danh sách tool còn lại.
- **Ứng viên vẫn cố nộp qua action cũ.** Không còn khả năng — file bị xóa hẳn, không chỉ ẩn UI.
- **Field `cv` là `required: true`.** Sau khi gỡ collection thì không còn ý nghĩa, nhưng nếu phase 02 lỡ chạy sau phase 03 sẽ không xóa được gì. Đây chính là lý do thứ tự ở §5 là bắt buộc.
