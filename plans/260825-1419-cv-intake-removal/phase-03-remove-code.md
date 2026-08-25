# Phase 03 — Gỡ collection, server action và MCP tools

**Goal:** Không còn dòng code nào phục vụ việc tiếp nhận CV. `job-applications` biến mất khỏi admin, `submitJobApplication` không tồn tại, MCP không còn tool applications.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/actions/submitJobApplication.ts` | DELETE |
| `src/collections/JobApplications/index.ts` | DELETE |
| `src/collections/JobApplications/hooks/denormalize.ts` | DELETE |
| `src/collections/JobApplications/hooks/syncSubscriber.ts` | DELETE |
| `src/mcp/tools/applications.ts` | DELETE |
| `src/mcp/utils/links.ts` | MODIFY — gỡ nhánh applications |
| `src/mcp/tools/index.ts` (hoặc nơi đăng ký tool) | MODIFY — bỏ đăng ký |
| `src/payload.config.ts` | MODIFY — bỏ import + bỏ khỏi mảng `collections` |
| `next.config.ts` | MODIFY — bỏ `experimental.serverActions.bodySizeLimit` |
| `src/payload-types.ts` | REGENERATE |
| `src/app/(payload)/admin/importMap.js` | REGENERATE |
| `scripts/purge-job-applications.ts` | DELETE (đã dùng xong ở phase 02) |

> Đường dẫn file đăng ký MCP tool phải xác nhận khi vào phase — bảng này cập nhật theo thực tế trước khi code.

## 2. Ghi chú

- **`next.config.ts`:** `bodySizeLimit: '6mb'` có comment nói rõ là cho CV upload. Trước khi bỏ, `grep -rn "'use server'" src/` để xác nhận không server action nào khác cần giới hạn lớn (`submitContact`, `subscribeNewsletter` chỉ nhận text). Nếu có → giữ lại và ghi chú.
- **`syncSubscriber`:** xóa hook không ảnh hưởng subscriber đã có. `upsertSubscriber` vẫn được `submitContact`/`subscribeNewsletter` dùng → **không xóa** `src/utilities/email/upsertSubscriber.ts`.
- **`denormalize.ts`:** chỉ phục vụ `job-applications` → xóa an toàn. Kiểm tra `src/collections/Jobs` không import nó.
- Chạy `pnpm generate:types` rồi `pnpm generate:importmap` sau khi sửa config.
- `tsc --noEmit` là công cụ chính để lộ import mồ côi.

## 3. Acceptance criteria

- [ ] `pnpm generate:types` + `pnpm generate:importmap` chạy xong.
- [ ] `pnpm exec tsc --noEmit` pass — không còn import gãy.
- [ ] `pnpm build` sạch.
- [ ] `grep -rni "job-applications\|submitJobApplication\|JobApplications" src/` → chỉ còn kết quả vô hại (nếu có, liệt kê rõ).
- [ ] `pnpm dev` → admin không còn nhóm "Recruitment" / collection Job Applications.
- [ ] Admin vẫn vào được, các collection khác hiển thị bình thường.
- [ ] `/vi/career` và `/vi/career/<jobId>` render đúng, modal vẫn hiện banner từ phase 01.
- [ ] MCP: gọi `/api/mcp` liệt kê tool → không còn tool applications, các tool jobs/posts/media vẫn hoạt động.
- [ ] Gửi thử form liên hệ và đăng ký newsletter → vẫn chạy (xác nhận `upsertSubscriber` không bị ảnh hưởng).

## 4. Out of scope

- Không tích hợp service CV mới.
- Không đụng collection `jobs`, `subscribers`, `form-submissions`.

## 5. Commit message dự kiến

```
refactor(recruitment): drop the job application intake entirely

With applications moving to a dedicated recruitment service, the site no
longer stores CVs: removes the job-applications collection and its
denormalize/syncSubscriber hooks, the submitJobApplication server action,
and the MCP applications tool.

Also drops experimental.serverActions.bodySizeLimit, which existed only to
carry CV uploads. upsertSubscriber stays — the contact and newsletter
flows still use it. Stored data was exported and purged in the previous
step.
```
