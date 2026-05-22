# Entity Relationship Diagram (ERD) — Dự án NodeTS

> **Mục đích file:** Cung cấp mô tả đầy đủ cơ sở dữ liệu MongoDB (Mongoose) của hệ thống **Multi-vendor E-Commerce Marketplace** để ChatGPT / công cụ AI **vẽ sơ đồ ERD** (PNG/SVG).
>
> **Hướng dẫn cho ChatGPT:** Đọc toàn bộ file → vẽ ERD chuẩn Chen (hình chữ nhật = entity, hình thoi = quan hệ, ghi rõ cardinality 1:1, 1:N, N:M). Dùng màu nhóm: Auth (xanh dương), Commerce (cam), Messaging (tím), Notification (xanh lá). Ghi chú các **embedded document** bằng khung nét đứt nối vào entity cha.

---

## 1. Tổng quan hệ thống

| Thuộc tính | Giá trị |
|------------|---------|
| Loại DB | MongoDB (NoSQL) |
| ODM | Mongoose |
| Domain | Thương mại điện tử đa người bán (Shopee-like) |
| Vai trò User | `admin`, `user` (seller = user có đăng sản phẩm) |
| Collection chính | 12 collection/model |

**Lưu ý kiến trúc MongoDB:** Một số quan hệ không tách collection riêng mà **nhúng (embed)** vào document cha (ví dụ: `Order.items`, `Cart.items`, `Address.addresses`, `Comment.comment[]`).

---

## 2. Danh sách Entity (Collection)

### 2.1. User
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `name` | String | required | Tên hiển thị |
| `email` | String | required, unique | |
| `phoneNumber` | String | required, unique | |
| `role` | String | enum: admin, user | Mặc định: user |
| `createdAt`, `updatedAt` | Date | timestamps | |

---

### 2.2. Auth
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `user_name` | String | required | Tên đăng nhập |
| `password` | String | required | Hash |
| `userId` | ObjectId | FK → User | 1 User ↔ 1 Auth (logic) |

---

### 2.3. Category
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `name` | String | required, unique | |
| `description` | String | optional | |
| `createdAt`, `updatedAt` | Date | timestamps | |

---

### 2.4. Product
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `name` | String | required | |
| `description` | String | required | |
| `categoryId` | ObjectId | FK → Category | |
| `sellerId` | ObjectId | FK → User | Người bán |
| `sale` | Number | min 0, nullable | % giảm giá |
| `variants` | Array[embedded] | | Xem **ProductVariant** |
| `images` | Array[String] | | URL ảnh |
| `isActive` | Boolean | default true | |
| `createdAt`, `updatedAt` | Date | timestamps | |

**Embedded: ProductVariant** (trong `Product.variants[]`)
| Thuộc tính | Kiểu |
|-----------|------|
| `color` | String |
| `size` | String |
| `stock` | Number |
| `sold` | Number |
| `price` | Number |

---

### 2.5. Cart
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `userId` | ObjectId | FK → User | Mỗi user 1 giỏ (logic) |
| `items` | Array[embedded] | | Xem **CartItem** |
| `totalPrice` | Number | default 0 | |
| `status` | String | enum: active, inactive | |
| `createdAt`, `updatedAt` | Date | timestamps | |

**Embedded: CartItem** (trong `Cart.items[]`)
| Thuộc tính | Kiểu | FK |
|-----------|------|-----|
| `productId` | ObjectId | → Product |
| `variant.color` | String | |
| `variant.size` | String | |
| `quantity` | Number | min 1 |
| `price` | Number | Giá tại thời điểm thêm |

---

### 2.6. Order
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `userId` | ObjectId | FK → User | Người mua |
| `sellerId` | ObjectId | FK → User | Người bán |
| `orderCode` | String | required, unique | Mã đơn |
| `items` | Array[embedded] | | Xem **OrderItem** |
| `shippingMethod` | String | economy, fast, express | |
| `shippingFee` | Number | | |
| `totalPrice` | Number | | |
| `shippingAddress` | embedded | | Snapshot địa chỉ giao |
| `status` | String | pending, shipping, delivered, cancelled | |
| `notes` | String | optional | |
| `createdAt`, `updatedAt` | Date | timestamps | |

**Embedded: OrderItem** (trong `Order.items[]`)
| Thuộc tính | Kiểu | FK |
|-----------|------|-----|
| `_id` | ObjectId | PK sub-document |
| `productId` | ObjectId | → Product |
| `variant.color`, `variant.size` | String | |
| `quantity` | Number | |
| `price` | Number | |

**Embedded: ShippingAddress** (snapshot, không FK)
| fullName, phoneNumber, address, province, ward, city?, district? |

---

### 2.7. Address
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `userId` | ObjectId | FK → User, **unique** | 1 doc / user |
| `addresses` | Array[embedded] | | Xem **AddressItem** |
| `createdAt`, `updatedAt` | Date | timestamps | |

**Embedded: AddressItem** (trong `Address.addresses[]`)
| Thuộc tính | Kiểu |
|-----------|------|
| `_id` | ObjectId (sub) |
| `fullName`, `phoneNumber` | String |
| `province`, `district?`, `ward`, `street?` | String |
| `isDefault` | Boolean |
| `type` | enum: home, office, warehouse |

---

### 2.8. Favorite
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `userId` | ObjectId | FK → User, **unique** | |
| `products` | Array[ObjectId] | FK → Product | Danh sách SP yêu thích |
| `createdAt`, `updatedAt` | Date | timestamps | |

---

### 2.9. Comment
> **Mô hình đặc biệt:** Mỗi document = **1 sản phẩm**, chứa mảng đánh giá.

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `productId` | String | required, unique | ID sản phẩm (string) |
| `comment` | Array[embedded] | | Xem **CommentItem** |
| `createdAt`, `updatedAt` | Date | timestamps | |

**Embedded: CommentItem** (trong `Comment.comment[]`)
| Thuộc tính | Kiểu | FK |
|-----------|------|-----|
| `_id` | ObjectId | PK sub |
| `userId` | ObjectId | → User |
| `orderId` | ObjectId | → Order |
| `orderItemId` | ObjectId | optional → Order.items._id |
| `productId` | ObjectId | → Product |
| `rating` | Number | 1–5 |
| `content` | String | |
| `img` | String | optional |
| `createdAt`, `updatedAt` | Date | |

**Unique index:** (userId + orderItemId) hoặc (userId + orderId + productId) — chống đánh giá trùng.

---

### 2.10. UserNotificationInbox
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `userId` | ObjectId | FK → User, **unique** | Hộp thư 1 user |
| `items` | Array[embedded] | | Xem **NotificationItem** |
| `createdAt`, `updatedAt` | Date | timestamps | |

**Embedded: NotificationItem**
| Thuộc tính | Kiểu | Mô tả |
|-----------|------|-------|
| `_id` | ObjectId | |
| `title`, `message` | String | |
| `type` | enum | order, payment, promotion, system, comment, favorite, general |
| `relatedId` | ObjectId | Polymorphic FK |
| `relatedModel` | String | Order, Payment, Product, Comment, User |
| `isRead`, `priority`, `actionUrl`, `actionText`, `imageUrl` | | |
| `metadata` | Mixed | |
| `expiresAt`, `sentAt`, `readAt` | Date | |

---

### 2.11. Conversation
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `participants` | Array[ObjectId] | FK → User | N:M User |
| `lastMessage` | ObjectId | FK → Message | optional |
| `lastMessageAt` | Date | | |
| `isGroup` | Boolean | default false | |
| `groupName`, `groupImage` | String | optional | |
| `createdBy` | ObjectId | FK → User | |
| `isActive` | Boolean | | |
| `createdAt`, `updatedAt` | Date | timestamps | |

---

### 2.12. Message
| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|-----------|------|-----------|-------|
| `_id` | ObjectId | PK | |
| `conversationId` | ObjectId | FK → Conversation | |
| `senderId` | ObjectId | FK → User | |
| `content` | String | required | |
| `messageType` | String | text, image | |
| `imageUrl` | String | optional | |
| `isRead` | Array[{userId, readAt}] | | Trạng thái đã đọc |
| `isDeleted` | Array[{userId, deletedAt}] | | Xóa phía user |
| `replyTo` | ObjectId | FK → Message | self-reference |
| `editedAt` | Date | optional | |
| `editHistory` | Array[{content, editedAt}] | | |
| `createdAt`, `updatedAt` | Date | timestamps | |

---

## 3. Bảng quan hệ (Relationships)

| # | Entity A | Quan hệ | Entity B | Cardinality | Ghi chú |
|---|----------|---------|----------|-------------|---------|
| 1 | User | có | Auth | 1 : 1 | `Auth.userId` |
| 2 | User | sở hữu | Address | 1 : 1 | `Address.userId` unique |
| 3 | User | có | Cart | 1 : 1 | `Cart.userId` |
| 4 | User | có | Favorite | 1 : 1 | `Favorite.userId` unique |
| 5 | User | có | UserNotificationInbox | 1 : 1 | `userId` unique |
| 6 | User | bán (seller) | Product | 1 : N | `Product.sellerId` |
| 7 | User | mua | Order | 1 : N | `Order.userId` |
| 8 | User | nhận đơn (seller) | Order | 1 : N | `Order.sellerId` |
| 9 | Category | chứa | Product | 1 : N | `Product.categoryId` |
| 10 | Product | nằm trong | CartItem | 1 : N | embed trong Cart |
| 11 | Product | nằm trong | OrderItem | 1 : N | embed trong Order |
| 12 | Product | được đánh giá trong | Comment | 1 : 1 doc | `Comment.productId` |
| 13 | User | viết | CommentItem | 1 : N | embed trong Comment |
| 14 | Order | là cơ sở | CommentItem | 1 : N | `orderId` bắt buộc |
| 15 | User | yêu thích | Product | N : M | qua `Favorite.products[]` |
| 16 | User | tham gia | Conversation | N : M | `participants[]` |
| 17 | Conversation | chứa | Message | 1 : N | `Message.conversationId` |
| 18 | User | gửi | Message | 1 : N | `Message.senderId` |
| 19 | Message | trả lời | Message | 1 : N | `replyTo` self |
| 20 | NotificationItem | tham chiếu đa hình | Order/Product/... | N : 1 | `relatedId` + `relatedModel` |

**Đã loại bỏ (không còn trong code):** Module `Follower` (theo dõi seller) — **không vẽ** trên ERD.

---

## 4. Sơ đồ Mermaid ER (copy để render)

```mermaid
erDiagram
    User ||--o| Auth : "userId"
    User ||--o| Address : "userId unique"
    User ||--o| Cart : "userId"
    User ||--o| Favorite : "userId unique"
    User ||--o| UserNotificationInbox : "userId unique"
    User ||--o{ Product : "sellerId"
    User ||--o{ Order : "buyer userId"
    User ||--o{ Order : "seller sellerId"
    User }o--o{ Conversation : "participants"
    User ||--o{ Message : "senderId"
    Category ||--o{ Product : "categoryId"
    Product ||--o{ CartItem : "embedded in Cart"
    Product ||--o{ OrderItem : "embedded in Order"
    Product ||--|| Comment : "productId unique doc"
    Order ||--o{ CommentItem : "orderId"
    User ||--o{ CommentItem : "userId"
    Favorite }o--o{ Product : "products array"
    Conversation ||--o{ Message : "conversationId"
    Message ||--o| Message : "replyTo"
    UserNotificationInbox ||--|{ NotificationItem : "items embedded"

    User {
        ObjectId _id PK
        string name
        string email UK
        string phoneNumber UK
        string role
    }
    Auth {
        ObjectId _id PK
        string user_name
        string password
        ObjectId userId FK
    }
    Category {
        ObjectId _id PK
        string name UK
        string description
    }
    Product {
        ObjectId _id PK
        string name
        ObjectId categoryId FK
        ObjectId sellerId FK
        array variants
        array images
        boolean isActive
    }
    Cart {
        ObjectId _id PK
        ObjectId userId FK
        array items
        number totalPrice
        string status
    }
    Order {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId sellerId FK
        string orderCode UK
        array items
        string status
    }
    Address {
        ObjectId _id PK
        ObjectId userId FK UK
        array addresses
    }
    Favorite {
        ObjectId _id PK
        ObjectId userId FK UK
        array products FK
    }
    Comment {
        ObjectId _id PK
        string productId UK
        array comment
    }
    UserNotificationInbox {
        ObjectId _id PK
        ObjectId userId FK UK
        array items
    }
    Conversation {
        ObjectId _id PK
        array participants FK
        ObjectId lastMessage FK
        boolean isGroup
        ObjectId createdBy FK
    }
    Message {
        ObjectId _id PK
        ObjectId conversationId FK
        ObjectId senderId FK
        string content
        ObjectId replyTo FK
    }
```

---

## 5. Prompt gợi ý gửi ChatGPT để tạo ảnh ERD

Copy khối dưới vào ChatGPT (kèm file này hoặc nội dung trên):

```
Bạn là chuyên gia database. Dựa trên tài liệu ERD_NODEJS_MARKETPLACE.md của hệ thống MongoDB marketplace NodeTS:

1. Vẽ Entity Relationship Diagram đầy đủ, landscape A3 hoặc 16:9.
2. Hiển thị 12 entity chính: User, Auth, Category, Product, Cart, Order, Address, Favorite, Comment, UserNotificationInbox, Conversation, Message.
3. Vẽ thêm các embedded entity (khung nét đứt): ProductVariant, CartItem, OrderItem, AddressItem, CommentItem, NotificationItem.
4. Ghi cardinality trên mỗi quan hệ (1:1, 1:N, N:M).
5. Đánh dấu PK (_id), FK (mũi tên), UK (unique).
6. Nhóm màu: Auth | Catalog (Category, Product) | Commerce (Cart, Order, Address, Favorite, Comment) | Messaging | Notification.
7. Không vẽ entity Follower (đã xóa).
8. Xuất ảnh PNG sắc nét, chữ tiếng Việt hoặc song ngữ Việt-Anh, font dễ đọc.
```

---

## 6. Sơ đồ ASCII tham khảo (layout)

```
                    ┌──────────┐
                    │ Category │
                    └────┬─────┘
                         │ 1:N
                    ┌────▼─────┐         ┌──────────┐
              ┌─────│ Product  │─────────│ Comment  │ (1 doc / productId)
              │     └────┬─────┘         └────▲─────┘
              │          │ sellerId          │ CommentItem → Order, User
         N:M  │          │                   │
    ┌─────────▼──┐   ┌───▼────┐         ┌────┴─────┐
    │  Favorite  │   │  User  │◄────────│   Auth   │
    └────────────┘   └───┬────┘         └──────────┘
         │               │
    ┌────┴────┐    ┌─────┼─────┬──────────┬────────────────┐
    │  Cart   │    │     │     │          │                │
    │(items)  │    │  Address  Order    UserNotification  │
    └─────────┘    │  (1:1)  (buyer/   Inbox (1:1)        │
                   │         seller)                     │
                   │     N:M participants                │
                   └──────────┬──────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Conversation   │
                    └─────────┬──────────┘
                              │ 1:N
                    ┌─────────▼──────────┐
                    │     Message        │──► replyTo (self)
                    └────────────────────┘
```

---

## 7. Nguồn code tham chiếu

| Entity | File model |
|--------|------------|
| User | `src/auth_user/model/userModel.ts` |
| Auth | `src/auth_user/model/authModel.ts` |
| Category | `src/category/model/categoryModel.ts` |
| Product | `src/product/model/productModel.ts` |
| Cart | `src/cart/model/cartModel.ts` |
| Order | `src/order/model/orderModel.ts` |
| Address | `src/address/model/addressModel.ts` |
| Favorite | `src/favorite/model/favoriteModel.ts` |
| Comment | `src/comment/model/commentModel.ts` |
| UserNotificationInbox | `src/notification/model/notificationModel.ts` |
| Conversation | `src/message/model/conversationModel.ts` |
| Message | `src/message/model/messageModel.ts` |

---

*Phiên bản tài liệu: 2026-05-17 — đồng bộ với codebase NodeTS tại nhánh hiện tại.*
