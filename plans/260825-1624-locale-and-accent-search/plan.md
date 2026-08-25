# Nội dung theo đúng ngôn ngữ, và tìm kiếm không dấu

**Date:** 2026-08-25 16:24 (Asia/Ho_Chi_Minh)
**Scope:** `src/blocks/*/query.ts`, `src/blocks/*/Component.tsx`, `src/collections/{Posts,Jobs,Categories}`, `src/app/(frontend)/api/site-search/`, `src/utilities/`, `scripts/`
**Trigger:** Hai lỗi phát hiện khi rà soát hiệu năng. Block không truyền `locale` nên `/en` hiển thị nội dung tiếng Việt. Và search chỉ khớp khi gõ đúng dấu — người dùng Việt thường gõ không dấu.

## 1. Goal

Vào `/en` thấy nội dung tiếng Anh, `/vi` thấy tiếng Việt, ở mọi block. Gõ `hoa si` trong ô tìm kiếm ra được "Họa sĩ Game 2D". Không đổi giao diện, không thêm dependency.

## 2. Kiểm chứng (Phase A1) — đã chạy, không suy đoán

### Chuỗi trong DB ở dạng NFC

```
title      : "Họa sĩ Game 2D"
codepoints : 48 1ecd 61 20 73 129 20 47 61 6d 65 20 32 44
NFC        : true
```

Thử `like` qua REST với từng dạng chuẩn hóa:

| Truy vấn | Codepoints | Hits |
|---|---|---|
| `Họa` NFC | `48 1ecd 61` | **1** |
| `Họa` NFD | `48 6f 323 61` | 0 |
| `ọa` | — | 1 |
| `oa` | — | 0 |
| `Game` | — | 1 |

**Kết luận: `like` KHÔNG hỏng với dấu tiếng Việt.** Nó khớp bình thường ở dạng NFC. Báo cáo trước nói "search không khớp dấu" là sai — lần test đó gửi NFD qua terminal.

Hai vấn đề thật sự, khác nhau:
1. Input ở dạng NFD (bàn phím macOS, một số IME) không khớp dữ liệu NFC.
2. Gõ không dấu (`hoa`) không khớp có dấu (`họa`) — đây mới là thứ người dùng mong đợi.

### Cơ chế `like` của adapter mongo

`buildSearchParams.js:253` tách chuỗi theo khoảng trắng rồi `$and` các điều kiện `{ $regex: escapeRegExp(word), $options: 'i' }`. Không có collation, không fold dấu. Nên muốn tìm không dấu thì phải có sẵn một bản text đã bỏ dấu để khớp vào.

### Localization

`payload.config.ts:100` — locales `en` (mặc định) và `vi`, **`fallback: true`**. Nhờ fallback, truyền `locale` vào query cho doc chưa dịch vẫn trả về bản `en` chứ không rỗng. Đây là điều kiện để phase 01 an toàn.

Field localized theo collection:

| Collection | Field localized dùng cho search |
|---|---|
| `posts` | `title`, `meta.description` |
| `jobs` | `title`, `description` |
| `categories` | `title` |
| `games` | `title`, `description` (không nằm trong search) |

## 3. Quyết định đã chốt (Q&A vòng 1)

| Câu hỏi | Lựa chọn |
|---|---|
| Phạm vi sửa search | **Cả hai** — chuẩn hóa NFC **và** tìm không dấu |
| Cách tìm không dấu | Field ẩn `searchText` (localized, có index) + hook điền tự động + backfill dữ liệu cũ |

## 4. Vì sao là field denormalized, không phải regex mở rộng

Phương án thay thế là tự dựng regex kiểu `/h[oòóọỏõô…]a/i`. Bị loại vì:

- `where` của Payload không nhận `$regex` thô — chỉ có tập operator định sẵn. Muốn dùng regex tự chế phải truy vấn thẳng mongo qua `payload.db`, tức là **đi vòng qua access control**.
- Regex mở rộng không dùng được index, quét toàn collection.
- Field `searchText` có `index: true` nên truy vấn đi qua index.

Đánh đổi: thêm 1 field ẩn mỗi collection, cần backfill một lần cho dữ liệu cũ.

## 5. Phase breakdown

| Phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| 01 | `phase-01-block-locale.md` | 6 block truyền `locale` vào query và vào cache key | — |
| 02 | `phase-02-accent-search.md` | Field `searchText` + hook + fold helper + route dùng nó | — |
| 03 | `phase-03-backfill.md` | Script điền `searchText` cho doc đã có | 02 |

01 và 02 độc lập. 03 phải sau 02 (cần field tồn tại trong config).

## 6. Phạm vi

**In scope**
- `src/blocks/{ArchiveBlock,CareersHighlight,CategoryShowcase,GamesPortfolio,IECLife,JobBoard}/{query.ts,Component.tsx}`
- `src/utilities/foldVietnamese.ts` (mới)
- `src/collections/Posts/index.ts`, `src/collections/Jobs/index.ts`, `src/collections/Categories.ts` — thêm field `searchText`
- Hook `syncSearchText` dùng chung
- `src/app/(frontend)/api/site-search/route.ts`
- `scripts/backfill-search-text.ts` (mới, dùng một lần)

**Out of scope**
- Không đụng `getCachedSocials` — collection `social` không có field localized nào
- Không thêm `searchText` cho `games` — search không bao gồm games
- Không bật `@payloadcms/plugin-search` (đã gỡ khỏi package.json)
- Không đụng SearchModal phía client — nó chỉ gửi `q`, mọi xử lý ở server
- Không đổi UI, không đổi giao diện admin

## 7. Rủi ro

- **Cache key thiếu locale → phục vụ nhầm ngôn ngữ.** Đây là rủi ro nghiêm trọng nhất của phase 01: query đổi theo locale mà key không đổi thì `/en` sẽ ăn cache của `/vi`. Giảm thiểu: sửa `query.ts` và cache key trong **cùng một lần sửa**, acceptance criteria bắt buộc mở cả hai locale và so sánh.
- **Hook ghi `searchText` sai khi update một phần.** `data` trong `beforeChange` có thể chỉ chứa field vừa đổi. Giảm thiểu: hook merge `originalDoc` với `data` trước khi tính.
- **Ghi với `locale: 'all'`** (seed, migration) khiến `data.title` là object `{en, vi}` thay vì string. Giảm thiểu: hook xử lý cả hai dạng.
- **Doc cũ chưa có `searchText`** → tìm không dấu không ra cho tới khi backfill xong. Chấp nhận được; phase 03 xử lý, và search vẫn hoạt động bình thường với truy vấn có dấu vì route giữ cả nhánh cũ.
- **`đ`/`Đ` không phân rã qua NFD.** Phải map tay, nếu quên thì "dong" không khớp "đông". Có test riêng trong acceptance.
