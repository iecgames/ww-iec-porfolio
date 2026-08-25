# Phase 02 — Tìm kiếm không dấu

**Goal:** Gõ `hoa si` ra được "Họa sĩ Game 2D". Gõ có dấu ở bất kỳ dạng chuẩn hóa nào (NFC hay NFD) đều khớp.

## 1. Files chạm vào

| File | Action |
|---|---|
| `src/utilities/foldVietnamese.ts` | CREATE |
| `src/collections/hooks/syncSearchText.ts` | CREATE |
| `src/collections/Posts/index.ts` | MODIFY — thêm field + hook |
| `src/collections/Jobs/index.ts` | MODIFY — thêm field + hook |
| `src/collections/Categories.ts` | MODIFY — thêm field + hook |
| `src/app/(frontend)/api/site-search/route.ts` | MODIFY — fold query, tìm trên `searchText` |
| `src/payload-types.ts` | REGENERATE |

## 2. `foldVietnamese.ts`

```ts
export function foldVietnamese(input: string): string {
  return input
    .normalize('NFD')                    // tách dấu khỏi chữ cái
    .replace(/[̀-ͯ]/g, '')     // bỏ dấu tổ hợp
    .replace(/đ/g, 'd')                  // đ KHÔNG phân rã qua NFD
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
```

Thứ tự quan trọng: `normalize('NFD')` trước, vì nó cũng gộp luôn việc chuẩn hóa input NFC/NFD về một dạng — nên hàm này giải quyết **cả hai** vấn đề (NFD không khớp, và tìm không dấu) bằng một cơ chế.

`đ`/`Đ` là ký tự độc lập trong Unicode, NFD không tách được, nên phải map tay.

## 3. Field `searchText`

Thêm vào mỗi collection, dùng chung shape:

```ts
{
  name: 'searchText',
  type: 'text',
  localized: true,
  index: true,
  admin: { hidden: true, readOnly: true },
}
```

`localized: true` vì nguồn của nó (`title`, `description`…) đều localized — nếu không thì bản vi sẽ ghi đè bản en.
`index: true` để `like` chạy qua index thay vì quét cả collection.

## 4. Hook `syncSearchText`

Hook **cấp collection**, `beforeChange`. Nhận danh sách field nguồn, ghép lại rồi fold.

Hai tình huống phải xử lý:

- **Update một phần** — `data` có thể chỉ chứa field vừa đổi. Phải merge `originalDoc` trước khi tính, nếu không `searchText` sẽ bị tính từ dữ liệu thiếu.
- **Ghi với `locale: 'all'`** (seed/migration) — `data.title` là object `{ en, vi }` chứ không phải string. Hook phải nhận ra và fold từng locale.

## 5. Route dùng `searchText`

`TARGETS` đổi sang trỏ vào `searchText`, và query được fold trước:

```ts
const folded = foldVietnamese(q)
// where: { searchText: { like: folded } }
```

Vì `like` tách theo khoảng trắng và `$and` từng từ, `hoa si` sẽ khớp `"hoa si game 2d"`. Giữ nguyên `limit`, `depth`, vòng lặp locale và phần merge theo id.

Giữ `MAX_QUERY_LENGTH`. Fold trước rồi mới kiểm tra rỗng — chuỗi toàn dấu có thể fold ra rỗng.

## 6. Acceptance criteria

- [ ] `pnpm generate:types` chạy xong, `searchText` có trong `payload-types.ts`.
- [ ] `pnpm exec tsc --noEmit` pass, `pnpm build` sạch.
- [ ] Unit-check `foldVietnamese` bằng node: `"Họa sĩ Game 2D"` → `"hoa si game 2d"`; `"Đông"` → `"dong"`; `"Việt Nam"` → `"viet nam"`.
- [ ] Cùng chuỗi ở dạng NFC và NFD fold ra **kết quả giống hệt nhau**.
- [ ] Sửa & lưu 1 job trong admin → `searchText` được điền (kiểm tra qua REST `?depth=0`).
- [ ] `GET /api/site-search?q=hoa si` → ra job "Họa sĩ Game 2D".
- [ ] `GET /api/site-search?q=Họa` (NFC) → vẫn ra.
- [ ] `GET /api/site-search?q=Họa` (NFD) → vẫn ra. **Đây là ca hồi quy của bug gốc.**
- [ ] `q=game` → vẫn ra như trước (không hồi quy).
- [ ] `q=` rỗng và `q` dài 150 ký tự → trả mảng rỗng, không lỗi.
- [ ] Sửa title job rồi lưu → tìm bằng title mới ra, bằng title cũ không ra.

## 7. Out of scope

- Không thêm `searchText` cho `games` — search không tìm trong games.
- Không backfill ở phase này (phase 03).
- Không đụng SearchModal client.

## 8. Commit message dự kiến

```
feat(search): match Vietnamese text without diacritics

Searching only worked when the typed string carried the same diacritics,
in the same Unicode normalization form, as the stored value — so "hoa si"
found nothing and an NFD "Họa" from a macOS keyboard missed an NFC "Họa"
in the database.

Posts, jobs and categories now carry a hidden localized searchText field
holding a folded copy of their searchable text, kept in sync by a
beforeChange hook. The search route folds the incoming query the same way
before matching. Normalizing to NFD during folding fixes the
normalization mismatch as a side effect.

The field is indexed; expanding accents into a regex instead would have
meant a raw Mongo query that bypasses access control, and a full scan.
```
