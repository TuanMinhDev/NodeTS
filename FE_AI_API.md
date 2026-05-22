# Tài liệu cho FE / AI: Thay đổi backend & API NodeTS

Base URL mặc định: **`http://<host>:3000/api/v1`** (xem `index.ts` — app mount tại `/api/v1`).

---

## 1. Tóm tắt các thay đổi đã áp dụng (Backend)

| Chủ đề | Mô tả |
|--------|--------|
| **Vai trò** | Chỉ còn `admin` và `user`. Không còn `seller`. Chỉ **admin** bán hàng (tạo/sửa/xóa SP, danh mục CRUD, xem/cập nhật đơn bán, cập nhật trạng thái đơn). |
| **Đăng ký** | `POST /user/register` luôn tạo `role: "user"`. Client **không** được tự gán `admin` qua API đăng ký. |
| **Follower** | Đã **gỡ module** `/follower` và toàn bộ API follow. Không còn thông báo “sản phẩm mới cho người follow”. |
| **Địa chỉ admin** | Admin **tối đa 1** địa chỉ trong danh sách; **không được DELETE** — chỉ **PUT** để sửa. User thường được nhiều địa chỉ. |
| **Mô hình hành chính** | Địa chỉ mới: **bắt buộc `province` (tỉnh/TP)** + **`ward` (xã/phường)**. `district` (quận/huyện cũ) **không bắt buộc**, optional — tương thích dữ liệu cũ. |
| **Đặt hàng `shippingAddress`** | Bắt buộc: `fullName`, `phoneNumber`, `address` (địa chỉ chi tiết/số nhà), **`province`**, **`ward`**. Hỗ trợ legacy: nếu chỉ có **`city`** thì server map sang `province`. `district`/`city` có thể đi kèm nếu cần lưu thêm. |
| **Tính phí ship (cùng tỉnh)** | Ước lượng km: **cùng `ward` → 2 km**, **khác `ward` (cùng tỉnh) → 12 km** — không dùng `district`. |
| **Trang cửa hàng public** | `GET /user/seller/:sellerId` chỉ hợp lệ khi `sellerId` là user có **`role: "admin"`**. Phần khu vực xuất hàng trong JSON là `warehouse: { province, ward } \| null`. |
| **`sellerId` trên đơn/SP** | Vẫn là field ID; giá trị thực tế phải là **`_id` của tài khoản admin** cửa hàng (trùng với `sellerId` trên `Product`). |

---

## 2. Quy ước chung cho mọi request

### 2.1. Xác thực JWT

- Header: **`Authorization: Bearer <token>`**  
  Hoặc (legacy): header **`token: <token>`** (JWT raw).
- Token do `POST /user/login` trả về field `token`. Payload JWT có `userId`, `role`.
- `401`: thiếu token / token lỗi. `403`: token hợp lệ nhưng **role không nằm trong danh sách** route cho phép.

### 2.2. Role trên route

- Ghi chú dưới mỗi endpoint: **`public`** | **`admin`** | **`user`** | **`admin \| user`** (cả hai đều gọi được nếu có token tương ứng).

### 2.3. JSON & multipart

- Hầu hết body là **`Content-Type: application/json`**.
- **Tạo/sửa sản phẩm** dùng **`multipart/form-data`**: field file `images` (nhiều ảnh), field text kèm theo (kể cả `variants` dạng chuỗi JSON).
- **Gửi tin nhắn có ảnh**: `multipart` (xem `POST /message/send`).

### 2.4. Socket.IO (cùng server HTTP)

- Client join phòng user: emit **`joinUserRoom`** với `userId` — nhận **`newNotification`** (thông báo).
- Chat: **`joinConversation`** / **`leaveConversation`**, **`typing`** / **`stopTyping`**, nhận **`newMessage`**, **`userTyping`**, **`messagesRead`**.  
  Chi tiết có thể tham chiếu file `FE_SOCKET_IO_API.md` (nếu có trong repo).

---

## 3. Giao diện Admin cần những gì (chức năng → API)

Admin đăng nhập = JWT có `role: "admin"`.

| Chức năng UI Admin | API / ghi chú |
|---------------------|----------------|
| Đăng nhập | `POST /user/login` (identifier + password) |
| Xem/sửa thông tin mình | `GET /user/me`, `PUT /user/update-info`, `POST /user/change-password` |
| **Một địa chỉ duy nhất** (điểm xuất hàng + liên hệ cửa hàng) | `POST /address/` (chỉ lần đầu), sau đó chỉ `PUT /address/:id` — **không** gọi DELETE |
| CRUD danh mục | `POST/GET/PUT/DELETE /category/...` (GET list/detail public; POST/PUT/DELETE admin) |
| CRUD sản phẩm | `POST /product/create`, `GET /product/seller` (danh sách SP hệ thống; query `?sellerId=&pageNumber=&pageSize=`), `PUT/DELETE /product/:id` |
| Xem SP public (debug) | `GET /product/get`, `GET /product/:id` |
| Quản lý đơn **bán** | `GET /order/seller` (optional `?sellerId=` lọc theo cửa hàng), `GET /order/seller/:id`, `PUT /order/status/:id` |
| (Tuỳ) xem như khách có tài admin | Giỏ, đặt hàng như user: `cart`, `order/create`, … — thường không cần trên dashboard bán |

**Không có** dashboard “seller” hay API follower.

---

## 4. Giao diện User (và khách): API chi tiết

Dưới đây mô tả từng endpoint để AI FE map màn hình. Method + đường dẫn tính từ **`/api/v1`**.

---

### 4.1. `/user`

| Method | Đường dẫn | Auth | Body / Query | Response / Ghi chú |
|--------|-----------|------|--------------|-------------------|
| **POST** | `/user/register` | public | `{ email, password, name, phoneNumber }` | `201` `{ message }`. Luôn tạo `user`. |
| **POST** | `/user/login` | public | `{ identifier, password }` — `identifier` là email **hoặc** SĐT | `200` `{ message, token }`. Cookie optional `access_token`. |
| **GET** | `/user/seller/:sellerId` | public | — | `200` `{ data: { sellerId, shopName, warehouse: { province, ward } \| null } }`. Chỉ admin hợp lệ. |
| **GET** | `/user/me` | admin, user | — | `200` user document (gồm `_id`, `name`, `email`, `role`, `phoneNumber`, …). |
| **PUT** | `/user/update-info` | admin, user | `{ name, email, address, phoneNumber }` — tất cả bắt buộc theo controller | `200` `{ message }`. |
| **GET** | `/user/all` | admin | Query: `search` \| `keyword` \| `q` \| `name` (tìm tên), `role` (lọc `admin`\|`user`) | `200` mảng users. |
| **DELETE** | `/user/delete/:id` | admin | — | `200` xóa user theo `id`. |
| **POST** | `/user/change-password` | admin, user | `{ oldPassword, newPassword }` | `200` đổi mật khẩu (lưu plaintext trong auth model hiện tại). |
| **POST** | `/user/refresh-token` | public | `{ refreshToken }` | `200` token mới (xem `authController`). |

---

### 4.2. `/product`

| Method | Đường dẫn | Auth | Body / Query | Ghi chú |
|--------|-----------|------|--------------|---------|
| **POST** | `/product/create` | admin | `multipart/form-data`: `images` (file[], tối đa 10), `name`, `description`, `category` (id danh mục), `variants` (JSON string hoặc object), optional `sale` (%) | `201` tạo SP; `sellerId` = admin đang đăng nhập. |
| **GET** | `/product/get` | public | Query: `name`, `category`, `minPrice`, `maxPrice`, `onSale`, `color`, `size`, `pageNumber`, `pageSize`, `sellerId` | `200` `{ items, totalItems, totalPages, currentPage }`. |
| **GET** | `/product/seller` | admin | Query: `sellerId?` (lọc SP theo admin đó), `pageNumber`, `pageSize` | Danh sách SP (quản trị). |
| **GET** | `/product/:id` | public | — | `200` `{ data: product }` (populate `sellerId`). |
| **PUT** | `/product/:id` | admin | `multipart` tương tự create; optional `removeImages` (JSON array URL) | Cập nhật SP. |
| **DELETE** | `/product/:id` | admin | — | Xóa SP. |

**Cấu trúc `variants` (mỗi phần tử):** `color`, `size`, `stock`, `sold`, `price` (number).

---

### 4.3. `/category`

| Method | Đường dẫn | Auth | Body / Query |
|--------|-----------|------|--------------|
| **POST** | `/category/` | admin | `{ name, description? }` |
| **GET** | `/category/` | public | — → `{ message, categories }` |
| **GET** | `/category/:id` | public | — |
| **PUT** | `/category/:id` | admin | `{ name, description? }` |
| **DELETE** | `/category/:id` | admin | — |

---

### 4.4. `/cart`

Tất cả: **`admin` | `user`** (Bearer).

| Method | Đường dẫn | Body / Query | Ghi chú |
|--------|-----------|--------------|---------|
| **POST** | `/cart/add` | `{ items: [{ productId, variant: { color, size }, quantity }] }` | Giá lấy từ SP (có tính `sale`). |
| **GET** | `/cart/get` | Query: `pageNumber`, `pageSize` | `404` nếu chưa có giỏ. Response: `items` (populate `productId`), `totalItems`, `totalPages`, `currentPage`. |
| **DELETE** | `/cart/delete` | `{ itemIds: string[] }` — `_id` dòng trong `cart.items` | Xóa theo id dòng giỏ. |
| **PUT** | `/cart/update/:id` | `{ quantity }` — `:id` = `_id` item trong giỏ | Cập nhật số lượng. |

---

### 4.5. `/order`

| Method | Đường dẫn | Auth | Query / Body | Ghi chú |
|--------|-----------|------|--------------|---------|
| **GET** | `/order/shipping-options` | admin, user | **Query:** `addressId` (ObjectId subdocument trong sổ địa chỉ user), và **`productId`** (một SP) **hoặc** `productIds` (chuỗi id phân tách `,`). | Tính phí gợi ý; logic đa seller vẫn có trong response nếu nhiều `sellerId` trên SP. |
| **POST** | `/order/create` | admin, user | Xem mục **Body đặt hàng** bên dưới | `sellerId` phải khớp `sellerId` trên tất cả SP trong `items` và user đó phải là **admin**. |
| **GET** | `/order/` | admin, user | — | Đơn **mua** của tôi: `userId` = tôi. |
| **GET** | `/order/:id` | admin, user | — | Chi tiết đơn mua (chỉ đơn của mình). |
| **GET** | `/order/seller` | admin | `?sellerId=` optional | Đơn **bán** (lọc theo cửa hàng). |
| **GET** | `/order/seller/:id` | admin | — | Chi tiết đơn bán (bất kỳ đơn). |
| **PUT** | `/order/status/:id` | admin | `{ status }` | `status`: `pending` \| `shipping` \| `delivered` \| `cancelled`. |

**Body `POST /order/create`:**

```json
{
  "sellerId": "<ObjectId admin cửa hàng>",
  "items": [
    {
      "productId": "<ObjectId>",
      "variant": { "color": "...", "size": "..." },
      "quantity": 1,
      "price": 100000
    }
  ],
  "shippingMethod": "economy|fast|express",
  "shippingAddress": {
    "fullName": "...",
    "phoneNumber": "...",
    "address": "Số nhà, đường...",
    "province": "Tỉnh/TP",
    "ward": "Xã/Phường",
    "city": "optional legacy → map province",
    "district": "optional"
  },
  "notes": "optional"
}
```

Server tự tính `shippingFee` và `totalPrice`; không tin phí ship từ client.

---

### 4.6. `/comment`

| Method | Đường dẫn | Auth | Ghi chú |
|--------|-----------|------|---------|
| **POST** | `/comment/` | admin, user | Body: `productId`, `orderId`, `orderItemId?`, `content`, `rating` (1–5), `img?`. Đơn phải **delivered** và thuộc user. |
| **GET** | `/comment/product/:productId` | public | Danh sách bình luận/đánh giá theo SP. |
| **GET** | `/comment/order/:orderId/reviewable-items` | admin, user | SP trong đơn chưa đánh giá (sau giao). |

---

### 4.7. `/favorite`

Tất cả **`admin` | `user`**.

| Method | Đường dẫn | Body / Params |
|--------|-----------|----------------|
| **POST** | `/favorite/` | `{ productId }` |
| **DELETE** | `/favorite/:productId` | — |
| **GET** | `/favorite/` | — |

---

### 4.8. `/notification`

Tất cả **`admin` | `user`**.

| Method | Đường dẫn | Query / Params |
|--------|-----------|----------------|
| **GET** | `/notification/` | `page`, `limit`, `isRead` (`true`/`false`) |
| **PUT** | `/notification/:id/read` | `:id` = **`items._id`** của thông báo trong inbox |
| **PUT** | `/notification/read-all` | — |
| **DELETE** | `/notification/:id` | — |

---

### 4.9. `/address`

Tất cả **`admin` | `user`**.

| Method | Đường dẫn | Body / Ghi chú |
|--------|-----------|----------------|
| **POST** | `/address/` | `{ fullName, phoneNumber, province, ward, street?, isDefault?, type?: home\|office\|warehouse, district? }`. **Admin:** chỉ tạo được **1** lần. |
| **GET** | `/address/` | Query: `pageNumber`, `pageSize` |
| **GET** | `/address/:id` | Subdocument id |
| **PUT** | `/address/:id` | Cập nhật từng field (có thể gửi `district` nếu cần). |
| **DELETE** | `/address/:id` | **Admin không được xóa** — 400. |
| **PUT** | `/address/:id/default` | Đặt mặc định. |

---

### 4.10. `/message`

Tất cả **`admin` | `user`**.

| Method | Đường dẫn | Ghi chú |
|--------|-----------|---------|
| **POST** | `/message/conversation` | 1-1: `{ participantId }`. Nhóm: `{ isGroup: true, groupName, groupImage?, participants: [] }`. |
| **GET** | `/message/conversations` | Danh sách hội thoại. |
| **GET** | `/message/conversation/:id` | Chi tiết hội thoại. |
| **POST** | `/message/send` | `multipart` hoặc JSON: `conversationId`, `content`, `messageType?`, `imageUrl?`, `replyTo?` + file ảnh nếu có. |
| **GET** | `/message/messages/:conversationId` | Lịch sử tin. |
| **PUT** | `/message/read/:conversationId` | Đánh đã đọc. |
| **DELETE** | `/message/message/:id` | Xóa tin. |
| **PUT** | `/message/message/:id` | Sửa tin. |

---

### 4.11. `/ai`

| Method | Đường dẫn | Auth | Ghi chú |
|--------|-----------|------|---------|
| **POST** | `/ai/chatbot/ask` | admin, user | `{ message, conversation_id? }` — proxy tới service Python (`PYTHON_AI_URL`). |
| **GET** | `/ai/recommend` | admin, user | Query `limit` — gợi ý theo `userId`. |
| **GET** | `/ai/recommend/popular` | public | Query `limit`. |
| **GET** | `/ai/health` | public | Trạng thái Node + Python AI. |

---

## 5. Liên quan MongoDB / vận hành

- User cũ có `role: "seller"` cần migration về `user` và gán sản phẩm/`sellerId` về **`_id` admin** cửa hàng.
- Đơn/địa chỉ cũ thiếu `province`/`ward` theo chuẩn mới: cần cập nhật dữ liệu hoặc form nhập đủ hai cấp khi chỉnh sửa.

---

*Tài liệu phản ánh code tại thời điểm sinh file; khi đổi route hoặc schema, cần cập nhật lại file này.*
