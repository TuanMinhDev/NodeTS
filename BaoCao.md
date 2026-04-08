## 1. Tổng quan hệ thống

Hệ thống là một backend Node.js (TypeScript) dùng Express và MongoDB, hỗ trợ:
-  Xác thực người dùng  (JWT, middleware gắn `req.user`)
-  Quản lý sản phẩm  với nhiều biến thể (màu, size, tồn kho, giá, đã bán)
-  Lưu trữ dữ liệu  trên MongoDB Atlas
-  Lưu trữ ảnh sản phẩm  trên Cloudinary
-  Gửi thông báo  khi có sản phẩm mới cho người theo dõi/seller

## 2. Luồng khởi động & kết nối cơ sở dữ liệu

1.  Đọc biến môi trường  từ `.env` (dùng `dotenv`).
2.  Khởi tạo kết nối MongoDB :
   - Sử dụng `mongoose`.
   - Hàm `connectDB` đọc `process.env.DB_PW` và tạo URL `mongodb+srv://...` tới MongoDB Atlas.
   - Nếu kết nối thành công: log `"Connect Successful!"`, nếu lỗi: log `"Connect failed!"` cùng chi tiết lỗi.
3.  Khởi tạo server Express  và gắn các route như `auth`, `product`, `notification`, ...

## 3. Luồng xác thực & phân quyền (khái quát)

1.  Đăng ký / đăng nhập :
   - Người dùng gửi thông tin lên endpoint auth (ví dụ: `/api/auth/register`, `/api/auth/login`).
   - Backend tạo hoặc kiểm tra user trong MongoDB.
   - Nếu đăng nhập thành công, backend trả về  JWT token .
2.  Bảo vệ route :
   - Các route quan trọng (ví dụ: tạo/sửa/xoá sản phẩm) sử dụng middleware xác thực.
   - Middleware:
     - Đọc token từ header `Authorization: Bearer <token>`.
     - Verify token.
     - Gắn thông tin user vào `req.user` (ví dụ: `{ userId, role, ... }`).
3.  Phân quyền :
   - Một số thao tác yêu cầu:
     -  Đã đăng nhập  (có `req.user`).
     -  Là chủ sở hữu tài nguyên  (ví dụ: `product.sellerId === req.user.userId`).
     - Hoặc  có role admin  (`req.user.role === "admin"`).

## 4. Chức năng sản phẩm (Product)

### 4.1. Mô hình sản phẩm (khái quát)

Sản phẩm (`Product`) thường có:
-  name : Tên sản phẩm.
-  description : Mô tả.
-  categoryId : Tham chiếu tới danh mục.
-  sellerId : Người bán / người tạo sản phẩm.
-  sale : Phần trăm hoặc thông tin khuyến mãi (có thể `null` nếu không khuyến mãi).
-  variants : Mảng các biến thể, mỗi biến thể gồm:
  - `color`: Màu.
  - `size`: Kích thước.
  - `stock`: Số lượng tồn.
  - `sold`: Số lượng đã bán.
  - `price`: Giá.
-  images : Danh sách URL ảnh được lưu trên Cloudinary.

### 4.2. Luồng tạo sản phẩm (`createProduct`)

1.  Xác thực :
   - Lấy `userId` từ `req.user` (đã được middleware gắn sẵn).
   - Nếu không có `userId` → trả về `401 - Chưa xác thực`.
2.  Nhận dữ liệu từ client :
   - Body gồm: `name`, `description`, `category`, `sale`, `variants`.
   - `variants` có thể là:
     - Đối tượng/mảng JSON (khi gửi `application/json`).
     - Chuỗi JSON (khi gửi `multipart/form-data`), cần `JSON.parse`.
3.  Validate dữ liệu :
   - Bắt buộc phải có: `name`, `description`, `category`, `variants`.
   - `variants` phải là  mảng không rỗng .
   - Mỗi phần tử `variant` phải có: `color`, `size`, `stock`, `sold`, `price`.
   - Kiểm tra kiểu và ràng buộc:
     - `stock >= 0`, `sold >= 0`, `price > 0`.
4.  Upload ảnh lên Cloudinary :
   - Lấy danh sách file từ `(req as any).files`.
   - Với mỗi file:
     - Dùng `cloudinary.uploader.upload_stream` với folder `"products"`.
     - Nhận lại `secure_url` và lưu vào mảng `imageUrls`.
5.  Tạo document sản phẩm :
   - Gán:
     - `sellerId = userId`.
     - `categoryId = category`.
     - `sale` (ép kiểu số nếu có, hoặc `null`).
     - `variants`: map lại đảm bảo `stock`, `sold`, `price` là `Number`.
     - `images = imageUrls`.
6.  Lưu vào MongoDB :
   - `await newProduct.save()`.
7.  Gửi thông báo :
   - Gọi `notifyProductCreated(userId, newProduct._id, name)` để gửi thông báo đến người theo dõi/seller (nếu lỗi gửi thông báo thì vẫn coi tạo sản phẩm thành công).
8.  Trả kết quả cho client :
   - `201 - Tạo sản phẩm thành công` kèm object sản phẩm.

### 4.3. Luồng lấy danh sách sản phẩm (`getProduct`)

1.  Nhận query từ client :
   - `name`: Tìm kiếm theo tên (regex, không phân biệt hoa thường).
   - `category`: Lọc theo tên/slug danh mục (regex).
   - `sellerId`: Lọc theo người bán.
   - `minPrice`, `maxPrice`: Lọc theo khoảng giá của `variants.price`.
   - `color`, `size`: Lọc theo màu, size của biến thể (regex).
   - `onSale`: Nếu `"true"` → chỉ lấy sản phẩm có `sale` khác `null`.
   - Phân trang: `pageNumber`, `pageSize`.
2.  Xây dựng điều kiện lọc (`filter`) :
   - Gán lần lượt vào object `filter`:
     - `filter.name = { $regex: name, $options: "i" }`.
     - `filter.category = { $regex: category, $options: "i" }` (hoặc `categoryId` tùy schema).
     - `filter.sellerId = sellerId`.
     - `filter["variants.price"]` với `$gte`, `$lte`.
     - `filter["variants.color"]`, `filter["variants.size"]`.
     - `filter.sale = { $ne: null }` nếu `onSale === "true"`.
3.  Phân trang :
   - `page = Number(pageNumber) || 1`.
   - `limit = Number(pageSize) || 10`.
   - `skip = (page - 1) * limit`.
4.  Truy vấn MongoDB :
   - `Product.find(filter)`
     - `.populate("sellerId", "name email avatar")`.
     - `.sort({ createdAt: -1 })` (mới nhất trước).
     - `.skip(skip).limit(limit)`.
   - Đếm tổng số document: `Product.countDocuments(filter)`.
5.  Trả kết quả :
   - `200 - OK` với:
     - `count`: số sản phẩm trong trang hiện tại.
     - `total`: tổng số sản phẩm thỏa điều kiện.
     - `page`, `pageSize`, `totalPages`.
     - `products`: danh sách sản phẩm (kèm thông tin seller).

toi # 4.4. Luồng cập nhật sản phẩm (`updateProduct`)

1.  Xác thực & phân quyền :
   - Lấy `userId` từ `req.user`.
   - Nếu không có → `401 - Chưa xác thực`.
   - Lấy `id` từ `req.params`.
   - Tìm `product` theo `id`.
   - Nếu không tồn tại → `404 - Không tìm thấy sản phẩm`.
   - Kiểm tra quyền:
     - Nếu `req.user.role !== "admin"`  và  `product.sellerId.toString() !== userId` → `403 - Không có quyền`.
2.  Nhận dữ liệu cập nhật :
   - Body có thể gồm: `name`, `description`, `category`, `sale`, `variants`, `removeImages`.
   - `variants` nếu là chuỗi → `JSON.parse`.
3.  Validate `variants` (nếu có gửi) :
   - Phải là mảng, không rỗng.
   - Mỗi phần tử phải có `color`, `size`, `stock`, `sold`, `price` và thoả điều kiện số như khi tạo.
4.  Xử lý ảnh :
   - Lấy file mới từ `(req as any).files`.
   - Upload lên Cloudinary, nhận `newUrls`.
   - `updatedImages = [...product.images, ...newUrls]`.
   - Nếu có `removeImages` (string JSON hoặc mảng):
     - Parse thành mảng `toRemove`.
     - Lọc `updatedImages` để loại các URL nằm trong `toRemove`.
5.  Tạo object `updateData` :
   - Chỉ cập nhật trường được gửi:
     - `name`, `description`, `categoryId`, `sale`, `images`.
     - Nếu có `parsedVariants` → map lại đảm bảo kiểu số cho `stock`, `sold`, `price`.
6.  Cập nhật MongoDB :
   - `Product.findByIdAndUpdate(id, updateData, { new: true })`.
7.  Trả kết quả :
   - `200 - Cập nhật sản phẩm thành công` với sản phẩm đã cập nhật.

### 4.5. Luồng lấy chi tiết sản phẩm (`getProductById`)

1. Lấy `id` từ `req.params`.
2. `Product.findById(id).populate("sellerId", "name email avatar")`.
3. Nếu không tìm thấy → `404 - Không tìm thấy sản phẩm`.
4. Nếu có → `200` kèm `product`.

### 4.6. Luồng xoá sản phẩm (`deleteProduct`)

1.  Xác thực & phân quyền :
   - Lấy `userId` từ `req.user`.
   - Nếu không có → `401 - Chưa xác thực`.
   - Lấy `id` từ `req.params`.
   - Tìm `deletedProduct = Product.findById(id)`.
   - Nếu không tồn tại → `404 - Không tìm thấy sản phẩm để xóa`.
   - Kiểm tra:
     - Nếu `req.user.role !== "admin"`  và  `deletedProduct.sellerId.toString() !== userId` → `403 - Không có quyền xóa`.
2.  Xoá sản phẩm :
   - `Product.findByIdAndDelete(id)`.
3.  Trả kết quả :
   - `200 - Xóa sản phẩm thành công`.

## 5. Chức năng thông báo (Notification)

1. Khi  tạo sản phẩm mới , hệ thống gọi `notifyProductCreated(userId, productId, productName)`.
2. Service notification:
   - Tìm những user cần nhận thông báo (ví dụ: theo dõi seller, admin, ...).
   - Tạo bản ghi thông báo trong DB (hoặc đẩy message qua WebSocket / push notification tuỳ kiến trúc).
3. Lỗi gửi thông báo  không làm fail  việc tạo sản phẩm:
   - Lỗi được log nhưng API vẫn trả `201` nếu lưu `Product` thành công.

## 6. Tóm tắt các chức năng chính

-  Kết nối MongoDB :
  - Dùng `mongoose`.
  - Lấy password từ `.env`.
  - Kết nối tới MongoDB Atlas, log kết quả.
-  Xác thực & phân quyền :
  - Dựa trên JWT.
  - Bảo vệ route, gắn `req.user`.
  - Phân quyền theo `role` và `sellerId`.
-  Quản lý sản phẩm :
  - Tạo sản phẩm với nhiều biến thể, ảnh Cloudinary.
  - Lọc, tìm kiếm, phân trang sản phẩm.
  - Cập nhật thông minh (thêm/xoá ảnh, cập nhật biến thể).
  - Xoá sản phẩm với kiểm tra quyền.
-  Thông báo :
  - Gửi thông báo khi có sản phẩm mới cho các user liên quan.

Bạn có thể dùng file này như tài liệu khái quát luồng hệ thống và chức năng. Nếu bạn muốn, tôi có thể bổ sung thêm luồng đăng ký/đăng nhập chi tiết hoặc các module khác (order, chat, real-time, v.v.) vào file này.

