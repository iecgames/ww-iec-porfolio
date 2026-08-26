# Link kiểu Video: bấm mở popup thay vì điều hướng

**Date:** 2026-08-26 14:48 (Asia/Ho_Chi_Minh)
**Scope:** `src/fields/link.ts`, `src/utilities/resolveLinkHref.ts`, `src/components/Link/`, `src/components/VideoPopup/`, `src/heros/`
**Trigger:** Field link dùng chung mới chỉ điều hướng được. Thêm lựa chọn Video để editor gắn YouTube/Vimeo/mp4 và bấm là mở popup ngay tại chỗ. Trong BrandHero, nó thay hẳn field `introVideoUrl` rời rạc.

## 1. Goal

Trong mọi chỗ dùng field link dùng chung, editor chọn được **Video** và dán URL. Trên giao diện, bấm vào link đó mở popup phát video thay vì chuyển trang. `introVideoUrl` của BrandHero bị gỡ; video giờ là một mục trong nhóm CTA.

## 2. Kiểm chứng (Phase A1)

| Sự thật | Bằng chứng |
|---|---|
| `VideoPopup` đã có sẵn và đủ dùng | `components/VideoPopup/index.tsx` — YouTube/Vimeo/mp4, modal HeroUI, toast báo URL sai, i18n namespace `Video` |
| Chỉ BrandHero dùng `VideoPopup` | `grep` → duy nhất `heros/BrandHero/index.tsx:387`. Đổi API của nó không ảnh hưởng nơi khác |
| `AboutWithStats` **không** dùng popup | Nó nhúng `<iframe>` inline (`Component.tsx:311`) — mục đích khác, không đụng |
| Bố cục CTA hiện tại | `[nút CTA] (nút play tròn) (share)` — video là nút tròn riêng, `cta` có `maxRows: 1` |
| **BrandHero có bản `resolveLinkHref` thứ ba** | `heros/BrandHero/index.tsx:47` — bản cục bộ, **thiếu nhánh `section`**, nên link anchor rơi về `link.url ?? '#'` → hỏng |

Lượt trước mình gộp `CMSLink` và `utilities/resolveLinkHref` nhưng **bỏ sót bản thứ ba này**. Task lần này đụng đúng chỗ đó nên dọn luôn.

## 3. Quyết định đã chốt (Q&A vòng 1)

| Câu hỏi | Lựa chọn |
|---|---|
| Link video hiển thị thế nào trong BrandHero | **Nút có nhãn như CTA thường** — nút play tròn biến mất |
| `introVideoUrl` | **Xóa hẳn field**. Giá trị cũ nằm lại trong Mongo, không ai đọc |
| `cta.maxRows` | **Nâng 1 → 2** — hệ quả bắt buộc của lựa chọn trên, để vẫn đặt được cả CTA lẫn video |

### Hệ quả người dùng cuối phải biết

Hero nào đang set `introVideoUrl` sẽ **mất nút video** sau khi deploy, cho tới khi editor vào thêm một mục CTA kiểu Video. Không có fallback. Đây là đánh đổi đã chốt.

## 4. Điểm kỹ thuật dễ sai

**`url` cũ còn sót khi đổi type.** Editor đổi một link từ `External URL` sang `Video` thì giá trị `url` cũ vẫn nằm trong doc. `resolveLinkHref` hiện có nhánh fallback về `link.url` (thêm ở lượt trước để cứu doc cũ), nên link video sẽ vô tình phân giải thành URL cũ và render ra thẻ điều hướng.

Bắt buộc chặn tường minh **trước** nhánh fallback:

```ts
if (link.type === 'video') return null   // video không phải href
```

Không có dòng này, bug xuất hiện im lặng và chỉ lộ ra với doc từng đổi type.

## 5. Thiết kế

- `fields/link.ts`: thêm option `{ label: 'Video popup', value: 'video' }` và field `video` (text, required, condition `type === 'video'`).
- `resolveLinkHref`: trả `null` cho type `video` — nó chỉ trả lời về href, không biết gì về popup.
- `VideoPopup`: nhận thêm prop `trigger?: React.ReactNode`. Có `trigger` thì render nó thay nút tròn mặc định; không có thì giữ nguyên hành vi cũ.
- `CMSLink`: rẽ nhánh `type === 'video'` **trước** khi gọi resolver, render `VideoPopup` với trigger dựng từ `label` + `appearance` + `className` — để link video trông giống mọi link khác.
- `BrandHero`: xóa resolver cục bộ, dùng bản chung; render danh sách `cta`, mục nào `type === 'video'` thì ra `VideoPopup` mang đúng style nút hero.

## 6. Phạm vi

**In scope**
- `src/fields/link.ts`, `src/utilities/resolveLinkHref.ts`
- `src/components/Link/index.tsx`, `src/components/VideoPopup/index.tsx`
- `src/heros/config.ts`, `src/heros/BrandHero/index.tsx`
- `src/payload-types.ts` (regenerate)

**Out of scope**
- Không đụng `AboutWithStats` — iframe inline, không phải popup
- Không đụng `VideoHero`
- Không sửa mô tả `"Search"` sai trong `fields/link.ts` (việc riêng đã nêu)
- Không viết migration chuyển `introVideoUrl` sang `cta` — đã chốt xóa hẳn

## 7. Rủi ro

- **`url` cũ rò rỉ vào link video.** Xem §4. Giảm thiểu: guard tường minh + acceptance criteria có đúng ca này.
- **Hero mất nút video sau deploy.** Đã chốt, ghi ở §3. Cần báo lại khi bàn giao.
- **`VideoPopup` là client component, `CMSLink` là server component.** Truyền JSX qua ranh giới server→client dưới dạng prop là hợp lệ, nhưng phải xác nhận bằng build thật chứ không suy đoán.
- **Link video lọt vào Header/Footer nav.** Field dùng chung nên option xuất hiện ở mọi nơi. Không chặn — một mục nav mở video là hợp lệ. Nhưng cần kiểm nó không làm vỡ nav.
