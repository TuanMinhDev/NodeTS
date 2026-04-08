# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
- JWT token được gửi trong header `Authorization: Bearer <token>`
- Token được lưu trong cookie `access_token` (HttpOnly)
- Refresh token có thể được sử dụng để lấy access token mới

---

## Authentication APIs

### 1. Register
**POST** `/api/user/register`

**Payload:**
```json
{
  "email": "string",
  "password": "string", 
  "name": "string",
  "phoneNumber": "string",
  "role": "user" | "seller" | "admin" (optional)
}
```

**Response:**
```json
{
  "message": "Đăng ký thành công"
}
```

### 2. Login
**POST** `/api/user/login`

**Payload:**
```json
{
  "identifier": "string", // email hoặc phone number
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Đăng nhập thành công",
  "token": "jwt_token_string"
}
```

### 3. Change Password
**POST** `/api/user/change-password`

**Headers:** `Authorization: Bearer <token>`

**Payload:**
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Response:**
```json
{
  "message": "Đổi mật khẩu thành công"
}
```

### 4. Refresh Token
**POST** `/api/user/refresh-token`

**Payload:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "message": "Lấy token mới thành công",
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

### 5. Get User Info
**GET** `/api/user/me`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Lấy thông tin người dùng thành công",
  "user": {
    "_id": "string",
    "email": "string",
    "name": "string", 
    "phoneNumber": "string",
    "role": "string",
    "avatar": "string",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

---

## Product APIs

### 1. Create Product
**POST** `/api/product/create`

**Headers:** `Authorization: Bearer <token>` (admin/seller only)

**Content-Type:** `multipart/form-data`

**Payload:**
```json
{
  "name": "string",
  "description": "string", 
  "category": "string", // categoryId
  "sale": "number", // optional, percentage discount
  "variants": "[{\"color\":\"string\",\"size\":\"string\",\"stock\":number,\"sold\":number,\"price\":number}]",
  "images": "file[]" // up to 10 images
}
```

**Response:**
```json
{
  "message": "Tạo sản phẩm thành công",
  "product": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "categoryId": "string",
    "sellerId": "string",
    "sale": "number",
    "variants": [
      {
        "color": "string",
        "size": "string", 
        "stock": "number",
        "sold": "number",
        "price": "number"
      }
    ],
    "images": ["string"],
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

### 2. Get Products (with filters)
**GET** `/api/product/get`

**Query Parameters:**
- `name`: string (optional) - search by product name
- `category`: string (optional) - filter by category
- `minPrice`: number (optional) - minimum price filter
- `maxPrice`: number (optional) - maximum price filter  
- `onSale`: boolean (optional) - filter products on sale
- `color`: string (optional) - filter by variant color
- `size`: string (optional) - filter by variant size
- `sellerId`: string (optional) - filter by seller
- `pageNumber`: number (optional, default: 1)
- `pageSize`: number (optional, default: 10)

**Response:**
```json
{
  "count": "number",
  "total": "number", 
  "page": "number",
  "pageSize": "number",
  "totalPages": "number",
  "products": [
    {
      "_id": "string",
      "name": "string",
      "description": "string",
      "categoryId": "string",
      "sellerId": {
        "_id": "string",
        "name": "string",
        "email": "string",
        "avatar": "string"
      },
      "sale": "number",
      "variants": [...],
      "images": ["string"],
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ]
}
```

### 3. Get Product by ID
**GET** `/api/product/get/:id`

**Response:**
```json
{
  "product": {
    "_id": "string",
    "name": "string", 
    "description": "string",
    "categoryId": "string",
    "sellerId": {
      "_id": "string",
      "name": "string",
      "email": "string", 
      "avatar": "string"
    },
    "sale": "number",
    "variants": [...],
    "images": ["string"],
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

### 4. Update Product
**PUT** `/api/product/update/:id`

**Headers:** `Authorization: Bearer <token>` (admin/seller only)

**Content-Type:** `multipart/form-data`

**Payload:**
```json
{
  "name": "string",
  "description": "string",
  "category": "string", 
  "sale": "number",
  "variants": "[{\"color\":\"string\",\"size\":\"string\",\"stock\":number,\"sold\":number,\"price\":number}]",
  "removeImages": "[\"url1\", \"url2\"]", // optional
  "images": "file[]" // optional new images
}
```

**Response:**
```json
{
  "message": "Cập nhật sản phẩm thành công",
  "product": "updated_product_object"
}
```

### 5. Delete Product
**DELETE** `/api/product/delete/:id`

**Headers:** `Authorization: Bearer <token>` (admin/seller only)

**Response:**
```json
{
  "message": "Xóa sản phẩm thành công"
}
```

---

## Cart APIs

### 1. Add to Cart
**POST** `/api/cart/add`

**Headers:** `Authorization: Bearer <token>`

**Payload:**
```json
{
  "items": [
    {
      "productId": "string",
      "variant": {
        "color": "string",
        "size": "string"
      },
      "quantity": "number"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Thêm sản phẩm vào giỏ hàng thành công",
  "cart": {
    "_id": "string",
    "userId": "string",
    "items": [
      {
        "_id": "string",
        "productId": "string",
        "variant": {
          "color": "string",
          "size": "string"
        },
        "quantity": "number",
        "price": "number"
      }
    ],
    "totalPrice": "number",
    "status": "active",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

### 2. Get Cart
**GET** `/api/cart`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Lấy giỏ hàng thành công",
  "cart": {
    "_id": "string",
    "userId": "string",
    "items": [...],
    "totalPrice": "number",
    "status": "active"
  }
}
```

### 3. Delete Items from Cart
**POST** `/api/cart/delete`

**Headers:** `Authorization: Bearer <token>`

**Payload:**
```json
{
  "itemIds": ["string"]
}
```

**Response:**
```json
{
  "message": "Xóa sản phẩm khỏi giỏ hàng thành công", 
  "cart": "updated_cart_object"
}
```

### 4. Update Cart Quantity
**PUT** `/api/cart/update/:id`

**Headers:** `Authorization: Bearer <token>`

**Payload:**
```json
{
  "quantity": "number"
}
```

**Response:**
```json
{
  "message": "Cập nhật số lượng thành công",
  "cart": "updated_cart_object"
}
```

---

## Order APIs

### 1. Create Order
**POST** `/api/order/create`

**Headers:** `Authorization: Bearer <token>`

**Payload:**
```json
{
  "sellerId": "string",
  "items": [
    {
      "productId": "string",
      "variant": {
        "color": "string", 
        "size": "string"
      },
      "quantity": "number",
      "price": "number"
    }
  ],
  "shippingAddress": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  },
  "paymentMethod": "string",
  "notes": "string" // optional
}
```

**Response:**
```json
{
  "_id": "string",
  "userId": "string",
  "sellerId": "string",
  "orderCode": "string",
  "items": [...],
  "totalPrice": "number",
  "shippingAddress": {...},
  "paymentMethod": "string",
  "notes": "string",
  "status": "pending",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 2. Get User Orders
**GET** `/api/order`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Lấy danh sách đơn hàng thành công",
  "orders": [
    {
      "_id": "string",
      "userId": "string",
      "sellerId": {
        "_id": "string",
        "name": "string",
        "email": "string"
      },
      "orderCode": "string",
      "items": [...],
      "totalPrice": "number",
      "status": "string",
      "createdAt": "datetime"
    }
  ]
}
```

### 3. Get Order by ID
**GET** `/api/order/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Lấy đơn hàng thành công",
  "order": "order_object_with_populated_data"
}
```

### 4. Update Order Status
**PUT** `/api/order/status/:id`

**Payload:**
```json
{
  "status": "pending" | "confirmed" | "preparing" | "shipping" | "delivered" | "cancelled" | "returned"
}
```

**Response:**
```json
{
  "_id": "string",
  "status": "updated_status",
  // ... other order fields
}
```

### 5. Delete Order
**DELETE** `/api/order/:id`

**Response:**
```json
{
  "message": "Xóa đơn hàng thành công"
}
```

---

## Error Responses

All APIs return consistent error responses:

```json
{
  "message": "Error description",
  "error": "detailed_error_if_available"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (permission denied)
- `404` - Not Found
- `500` - Internal Server Error

---

## Notes

1. **Authentication**: Most APIs require JWT token in Authorization header
2. **File Uploads**: Product creation/update supports up to 10 images
3. **Pagination**: Product listing supports pagination with `pageNumber` and `pageSize`
4. **Filters**: Products can be filtered by multiple criteria
5. **Role-based Access**: Some endpoints have role restrictions (admin/seller only)
6. **Data Validation**: All payloads are validated before processing
7. **Error Handling**: Comprehensive error messages provided for debugging
