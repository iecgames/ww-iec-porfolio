# Hướng dẫn cấu hình Email

Hệ thống newsletter sử dụng Payload CMS email adapter với **Resend** (https://resend.com).

---

## Biến môi trường cần thiết

Thêm các biến sau vào file `.env` (copy từ `.env.example`):

```dotenv
# Tên và địa chỉ hiển thị trong trường "From" của mọi email gửi đi
EMAIL_FROM_NAME=IEC
EMAIL_FROM=newsletter@iec.vn

# Resend API key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

---

## Cấu hình Resend

[Resend](https://resend.com) là dịch vụ transactional email hiện đại, dễ tích hợp, gói miễn phí 3.000 email/tháng.

### Các bước

1. **Đăng ký tài khoản** tại [resend.com](https://resend.com)

2. **Xác minh domain** trong phần *Domains* → Add Domain → nhập domain của bạn (ví dụ `iec.vn`) → thêm các DNS records được cung cấp (SPF, DKIM, DMARC) vào nhà cung cấp DNS.

3. **Tạo API Key** trong phần *API Keys* → Create API Key → chọn quyền *Sending access*.

4. **Cập nhật `.env`**:

```dotenv
EMAIL_FROM=newsletter@iec.vn
EMAIL_FROM_NAME=IEC
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

> **Lưu ý**: Địa chỉ `EMAIL_FROM` phải thuộc domain đã được xác minh trên Resend. Trong môi trường test (domain chưa xác minh) bạn chỉ có thể gửi đến `delivered@resend.dev`.

---

## Kiểm tra sau khi cấu hình

1. Khởi động lại server (`pnpm dev`).
2. Vào **Admin Panel → Newsletter → Email Campaigns**.
3. Tạo một campaign mới (type: Manual), viết nội dung, nhấn **Gửi Campaign**.
4. Kiểm tra hòm thư của subscriber thử nghiệm.

Nếu gặp lỗi, xem log trong terminal — adapter sẽ in thông báo lỗi chi tiết từ Resend API.

---

## Kiểm tra DNS

Sau khi thêm DNS records, dùng lệnh sau để xác nhận SPF và DKIM đã propagate:

```bash
# Kiểm tra SPF
nslookup -type=TXT iec.vn

# Kiểm tra DKIM (thay resend._domainkey bằng selector thực tế)
nslookup -type=TXT resend._domainkey.iec.vn
```

Resend Dashboard cũng hiển thị trạng thái xác minh trong mục *Domains*.

---

## Ghi chú thêm

| Tình huống | Hành động |
|---|---|
| Resend lỗi khi gửi campaign | Campaign giữ trạng thái `draft` trong admin, admin có thể click **Gửi Campaign** lại sau khi sửa cấu hình |
| Giới hạn gửi của Resend free tier | 3.000 email/tháng, 100 email/ngày. Nâng cấp plan nếu cần gửi nhiều hơn |
