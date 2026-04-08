# Hướng dẫn Field `type` trong Address API

> **Cập nhật:** Field `type` đã được thêm vào model địa chỉ. Tài liệu này mô tả tác động lên từng API và các rule đặc biệt theo role.

---

## 1. Giá trị hợp lệ

| Value       | Mô tả          |
|-------------|----------------|
| `home`      | Nhà riêng (mặc định nếu không truyền) |
| `office`    | Văn phòng / Công ty |
| `warehouse` | Kho hàng *(chỉ dùng cho Seller)* |

---

## 2. Cấu trúc địa chỉ trả về (Address Item)

```json
{
  "_id": "664abc123...",
  "fullName": "Nguyễn Văn A",
  "phoneNumber": "0901234567",
  "province": "Hà Nội",
  "district": "Cầu Giấy",
  "ward": "Dịch Vọng",
  "street": "Số 10 Trần Thái Tông",
  "isDefault": false,
  "type": "home"
}
```

---

## 3. API bị ảnh hưởng

### 3.1 `POST /addresses` — Thêm địa chỉ

**Body:**
```json
{
  "fullName": "...",
  "phoneNumber": "...",
  "province": "...",
  "district": "...",
  "ward": "...",
  "street": "...",        // optional
  "isDefault": false,     // optional, default: false
  "type": "home"          // optional, default: "home"
}
```

**Validation:**
- Nếu `type` được truyền nhưng không nằm trong `["home", "office", "warehouse"]` → `400 Bad Request`

**Logic theo role `seller`:**
| Tình huống | Kết quả |
|---|---|
| Seller chưa có địa chỉ nào, thêm địa chỉ **không phải** `warehouse` | ❌ `400` — Seller phải có ít nhất 1 địa chỉ kho hàng. Thêm `warehouse` trước |
| Seller đã có `warehouse`, thêm thêm 1 `warehouse` nữa | ❌ `400` — Chỉ được có 1 địa chỉ `warehouse` |
| Seller đã có `warehouse`, thêm `home` hoặc `office` | ✅ Thành công |

---

### 3.2 `PUT /addresses/:id` — Sửa địa chỉ

**Body:** (tất cả các field đều optional, chỉ truyền field muốn cập nhật)
```json
{
  "type": "office"
}
```

**Validation:**
- Nếu `type` được truyền nhưng không hợp lệ → `400 Bad Request`

**Logic theo role `seller`:**
| Tình huống | Kết quả |
|---|---|
| Đổi địa chỉ `warehouse` duy nhất sang type khác (`home`/`office`) | ❌ `400` — Phải giữ ít nhất 1 `warehouse` |
| Đổi địa chỉ khác thành `warehouse` khi đã có `warehouse` rồi | ❌ `400` — Chỉ được có 1 `warehouse` |
| Mọi trường hợp hợp lệ khác | ✅ Thành công |

---

### 3.3 `DELETE /addresses/:id` — Xóa địa chỉ

**Logic theo role `seller`:**
| Tình huống | Kết quả |
|---|---|
| Xóa địa chỉ `warehouse` duy nhất | ❌ `400` — Không thể xóa, phải giữ ít nhất 1 `warehouse` |
| Xóa địa chỉ khác (không phải `warehouse`) | ✅ Thành công |

---

### 3.4 `GET /addresses` — Lấy danh sách địa chỉ

Không có thay đổi về request. Response trả về mỗi item đều có thêm field `type`.

**Response:**
```json
{
  "items": [
    { "_id": "...", "fullName": "...", "type": "home", ... },
    { "_id": "...", "fullName": "...", "type": "warehouse", ... }
  ],
  "totalItems": 2,
  "totalPages": 1,
  "currentPage": 1
}
```

---

### 3.5 `GET /addresses/:id` — Lấy chi tiết 1 địa chỉ

Không có thay đổi về request. Response trả về item có thêm field `type`.

**Response:**
```json
{
  "data": {
    "_id": "664abc123...",
    "type": "office",
    ...
  }
}
```

---

## 4. Tóm tắt rule cho Frontend

| Role | Lưu ý |
|------|-------|
| `user` / `admin` | Chỉ dùng `home` hoặc `office`. Không dùng `warehouse`. |
| `seller` | Địa chỉ **đầu tiên** bắt buộc phải là `warehouse`. Chỉ được có **đúng 1** `warehouse`. Không được xóa hoặc đổi type của `warehouse` duy nhất đó. |

### Gợi ý UX

- Với **user thông thường**: Hiển thị dropdown chọn loại địa chỉ gồm `Nhà riêng` và `Văn phòng`.
- Với **seller**: Hiển thị thêm option `Kho hàng`, đồng thời ẩn/disable option `warehouse` nếu đã tạo rồi. Hiển thị cảnh báo khi cố xóa hoặc thay đổi type của địa chỉ `warehouse` duy nhất.
