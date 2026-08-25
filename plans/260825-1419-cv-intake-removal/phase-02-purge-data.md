# Phase 02 — Export backup rồi xóa hồ sơ và file CV

**Goal:** Toàn bộ document `job-applications` và đúng những media là CV bị xóa khỏi Mongo và GCS, sau khi đã export ra file backup. Ảnh của site không bị đụng tới.

> ⚠ **Phase không hoàn tác được.** Chỉ chạy sau khi phase 01 đã deploy và xác nhận không còn hồ sơ mới vào.
> ⚠ **Phải chạy khi `JobApplications` VẪN CÒN trong `payload.config.ts`.** Gỡ trước là mất đường truy vấn.

## 1. Files chạm vào

| File | Action |
|---|---|
| `scripts/purge-job-applications.ts` | CREATE — script dùng một lần |
| `package.json` | MODIFY — thêm script `purge:applications` |

Không sửa file `src/` nào ở phase này.

## 2. Thuật toán bắt buộc — đúng thứ tự

```
1. payload.find({ collection: 'job-applications', depth: 1, pagination: false })
2. Export toàn bộ ra JSON: mọi field + cv.id + cv.filename + cv.url
   → ghi ra file NGOÀI repo, đường dẫn truyền qua --out
3. Gom danh sách cvMediaIds từ bước 1   ← PHẢI trước bước 5
4. In báo cáo: số application, số media id, và với mỗi media: id / alt / filename
5. Nếu KHÔNG có cờ --confirm  → dừng tại đây (dry-run mặc định)
6. payload.delete media theo từng id trong cvMediaIds
   (storage-gcs adapter tự xóa object trên GCS khi media doc bị xóa)
7. payload.delete toàn bộ doc job-applications
```

Bước 3 đứng trước bước 6/7 là điểm mấu chốt: xóa application trước sẽ khiến media CV thành mồ côi, lẫn vào ảnh site và không còn cách nhận diện an toàn.

## 3. Lưới an toàn

- **Dry-run là mặc định.** Phải truyền `--confirm` mới xóa thật.
- **Đối chiếu chéo:** với mỗi media sắp xóa, kiểm tra `alt` có bắt đầu bằng `CV — ` không. Nếu có cái nào KHÔNG khớp → in cảnh báo nổi bật và **dừng**, bắt người chạy xem lại thủ công. Đây là chốt chặn chống xóa nhầm ảnh site.
- **Đếm trước/sau:** ghi lại `totalDocs` của collection `media` trước và sau khi xóa. Hiệu số phải đúng bằng số CV. Lệch → báo lỗi.
- Script dùng `overrideAccess: true` (chạy ngoài request context) và `context: { disableRevalidate: true }` để không bắn revalidate hàng loạt.

## 4. Acceptance criteria

- [ ] Chạy dry-run: in ra đúng số hồ sơ đang có, kèm danh sách media id/alt/filename.
- [ ] File export JSON tồn tại, mở được, chứa đủ số bản ghi bằng con số dry-run báo.
- [ ] Mọi media trong danh sách đều có `alt` khớp `CV — ` (nếu không, dừng và báo cáo cho user trước khi tiếp tục).
- [ ] Ghi lại `media.totalDocs` trước khi xóa.
- [ ] Chạy `--confirm`: script chạy xong không lỗi.
- [ ] `media.totalDocs` sau = trước − (số CV). Không lệch.
- [ ] Admin → Media: ảnh site (logo, hero, ảnh bài viết) còn nguyên; mở trang chủ và 1 bài viết, ảnh vẫn hiển thị.
- [ ] Admin → Job Applications: rỗng.
- [ ] Kiểm tra GCS bucket: file CV đã biến mất, ảnh site còn.
- [ ] Subscriber `source: 'job_application'` **vẫn còn** (theo quyết định plan §4).

## 5. Out of scope

- Không xóa subscriber (xem plan §4 — cần user xác nhận riêng nếu muốn).
- Không gỡ code — phase 03.
- Script không cần chạy được lần hai; sau phase 03 nó sẽ không còn tác dụng và có thể xóa.

## 6. Commit message dự kiến

```
chore(recruitment): add one-off script to purge stored applications

Removes every job-applications document and the media rows holding the
uploaded CVs, after writing a JSON export of both to a file outside the
repo. CVs share the media collection with site imagery and carry no
distinguishing field, so the script collects cv media ids from the
applications before deleting anything and refuses to proceed if any
candidate row's alt does not match the "CV — " pattern.

Dry-run by default; --confirm performs the deletion. Must run while the
collection is still registered in payload.config.ts.
```
