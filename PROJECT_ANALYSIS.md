# 📊 Project Analysis & Optimization Plan

## 🔍 **Permission Requirements Analysis**

### **Admin Only**
- `GET /api/v1/user/all` - Get all users
- `DELETE /api/v1/user/delete/:id` - Delete user

### **Admin & Seller**
- `POST /api/v1/product/create` - Create product
- `PUT /api/v1/product/update/:id` - Update product  
- `DELETE /api/v1/product/delete/:id` - Delete product
- `POST /api/v1/category/` - Create category
- `PUT /api/v1/category/:id` - Update category
- `DELETE /api/v1/category/:id` - Delete category

### **Admin & User & Seller**
- `POST /api/v1/address/` - Create address
- `GET /api/v1/address/` - Get addresses
- `PUT /api/v1/address/:id` - Update address
- `DELETE /api/v1/address/:id` - Delete address
- `PUT /api/v1/address/:id/default` - Set default address
- `POST /api/v1/follower/follow` - Follow seller
- `DELETE /api/v1/follower/unfollow/:sellerId` - Unfollow seller
- `GET /api/v1/follower/following` - Get followed sellers
- `GET /api/v1/follower/followers/:sellerId` - Get seller followers
- `GET /api/v1/follower/status/:sellerId` - Check follow status
- `POST /api/v1/message/conversation` - Create conversation
- `GET /api/v1/message/conversations` - Get conversations
- `GET /api/v1/message/conversation/:id` - Get conversation
- `POST /api/v1/message/send` - Send message
- `GET /api/v1/message/messages/:conversationId` - Get messages
- `PUT /api/v1/message/read/:conversationId` - Mark as read
- `DELETE /api/v1/message/message/:id` - Delete message
- `PUT /api/v1/message/message/:id` - Edit message
- `POST /api/v1/favorite/` - Add to favorites
- `DELETE /api/v1/favorite/:productId` - Remove from favorites
- `GET /api/v1/favorite/` - Get favorites
- `GET /api/v1/favorite/check/:productId` - Check favorite
- `POST /api/v1/comment/` - Create comment
- `PUT /api/v1/comment/:id` - Update comment
- `DELETE /api/v1/comment/:id` - Delete comment
- `POST /api/v1/comment/:id/like` - Like comment
- `POST /api/v1/comment/:id/reply` - Reply to comment

### **Admin & User**
- `GET /api/v1/user/me` - Get user info
- `PUT /api/v1/user/update-info` - Update user info
- `POST /api/v1/user/change-password` - Change password
- `POST /api/v1/cart/add` - Add to cart
- `GET /api/v1/cart/get` - Get cart
- `DELETE /api/v1/cart/delete` - Delete from cart
- `PUT /api/v1/cart/update/:id` - Update cart quantity

### **Public (No Auth Required)**
- `POST /api/v1/user/register` - Register
- `POST /api/v1/user/login` - Login
- `POST /api/v1/user/refresh-token` - Refresh token
- `GET /api/v1/product/get` - Get products
- `GET /api/v1/product/get/:id` - Get product by ID
- `GET /api/v1/category/` - Get categories
- `GET /api/v1/category/:id` - Get category by ID
- `GET /api/v1/comment/product/:productId` - Get comments by product

## 🔄 **Redundant Code Patterns Identified**

### **1. User Authentication Pattern** (Repeated 25+ times)
```typescript
const userId = req.user?.userId || req.user?.id;
if (!userId) return res.status(401).json({ message: "Chưa xác thực" });
```

### **2. Error Handling Pattern** (Repeated 40+ times)
```typescript
} catch (error: any) {
    return res.status(500).json({ message: error.message });
}
```

### **3. Parameter ID Validation** (Repeated 15+ times)
```typescript
const { id } = req.params;
if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID không hợp lệ" });
}
```

### **4. Ownership Check Pattern** (Repeated 10+ times)
```typescript
if (item.userId.toString() !== userId && req.user?.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền" });
}
```

### **5. Pagination Pattern** (Repeated 8+ times)
```typescript
const page = Number(page) || 1;
const limit = Number(limit) || 10;
const skip = (page - 1) * limit;
```

### **6. Cloudinary Upload Pattern** (Repeated 3+ times)
```typescript
const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "folder_name" },
        (error, result) => {
            if (error || !result) return reject(error);
            resolve(result);
        }
    );
    uploadStream.end(file.buffer);
});
```

## 🎯 **Optimization Strategy**

### **Create Shared Components in `src/_component`**

#### **1. Authentication Utilities**
- `getUserIdFromRequest()` - Extract and validate user ID
- `requireAuthentication()` - Middleware for auth check

#### **2. Error Handling**
- `handleAsyncError()` - Async error wrapper
- `standardErrorResponse()` - Standardized error responses

#### **3. Validation Utilities**
- `validateObjectId()` - ID validation
- `validatePagination()` - Pagination parameters

#### **4. Database Utilities**
- `checkOwnership()` - Resource ownership check
- `populateUser()` - Standard user population

#### **5. Cloudinary Utilities**
- `uploadToCloudinary()` - Generic Cloudinary upload
- `deleteFromCloudinary()` - Generic Cloudinary delete

#### **6. Response Utilities**
- `successResponse()` - Standardized success responses
- `paginatedResponse()` - Standardized pagination responses

## 📈 **Expected Optimizations**

### **Code Reduction**
- **Before**: ~3,000 lines of repetitive code
- **After**: ~2,000 lines with shared components
- **Reduction**: ~33% code reduction

### **Maintenance Benefits**
- Single source of truth for common patterns
- Easier to update authentication logic
- Consistent error handling across all endpoints
- Standardized response formats

### **Performance Benefits**
- Reduced bundle size
- Faster development with reusable components
- Fewer bugs due to centralized logic

## 🚀 **Implementation Priority**

### **Phase 1: Core Utilities** (High Priority)
1. Authentication utilities
2. Error handling utilities
3. Response utilities

### **Phase 2: Database Utilities** (Medium Priority)
1. Validation utilities
2. Ownership checks
3. Pagination utilities

### **Phase 3: File Upload Utilities** (Low Priority)
1. Cloudinary utilities
2. File validation utilities

## 🔧 **Files to Create**

```
src/_component/
├── utils/
│   ├── auth.ts              # Authentication utilities
│   ├── validation.ts        # Validation utilities
│   ├── response.ts          # Response utilities
│   ├── database.ts          # Database utilities
│   └── cloudinary.ts        # Cloudinary utilities
├── middleware/
│   ├── asyncHandler.ts      # Async error handling
│   ├── pagination.ts        # Pagination middleware
│   └── ownership.ts         # Ownership check middleware
└── types/
    ├── common.ts             # Common TypeScript types
    └── api.ts                # API response types
```

This optimization will significantly reduce code duplication and improve maintainability! 🎯
