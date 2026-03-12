# 📸 Message Image Upload Feature

## ✅ **Cloudinary Integration Added**

### 🎯 **Features Implemented**
- ✅ **Image Upload**: Upload images directly to Cloudinary
- ✅ **Auto-optimization**: Automatic quality and format optimization
- ✅ **Folder Organization**: Images stored in `message_images` folder
- ✅ **Size Limit**: 5MB maximum file size
- ✅ **Format Support**: All common image formats (jpg, png, gif, webp, etc.)

### 🛠️ **Technical Implementation**

#### **Middleware Chain**
```typescript
// Image upload middleware chain
messageRouter.post("/send", 
    checkPermission(["admin", "user", "seller"]),           // 1. Authentication
    uploadMessageImage,                                       // 2. Multer upload to memory
    uploadMessageImageToCloudinary,                          // 3. Cloudinary upload
    sendMessage                                               // 4. Process message
);
```

#### **Cloudinary Configuration**
```typescript
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload options
{
    folder: "message_images",
    resource_type: "image",
    quality: "auto",
    fetch_format: "auto"
}
```

### 📱 **API Usage**

#### **Send Text Message (No Image)**
```bash
POST /api/v1/message/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "conversationId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "content": "Hello everyone!",
  "messageType": "text"
}
```

#### **Send Image Message**
```bash
POST /api/v1/message/send
Content-Type: multipart/form-data
Authorization: Bearer <token>

conversationId: "60f7b3b3b3b3b3b3b3b3b3b3"
content: "Check out this photo!"
image: [file data]
```

#### **Send Image Only (No Caption)**
```bash
POST /api/v1/message/send
Content-Type: multipart/form-data
Authorization: Bearer <token>

conversationId: "60f7b3b3b3b3b3b3b3b3b3b3"
image: [file data]
```

### 🔌 **Real-time Image Messages**

#### **Socket.IO Event**
```javascript
socket.on("newMessage", (message) => {
    if (message.messageType === "image") {
        console.log("Image URL:", message.imageUrl);
        console.log("Caption:", message.content);
        
        // Display image
        const imgElement = document.createElement('img');
        imgElement.src = message.imageUrl;
        imgElement.alt = message.content || "Image";
        
        // Add to chat
        chatContainer.appendChild(imgElement);
    }
});
```

### 🎨 **Client Implementation**

#### **HTML Form**
```html
<form id="messageForm" enctype="multipart/form-data">
    <input type="hidden" name="conversationId" value="conv_id">
    
    <!-- Text input -->
    <input type="text" name="content" placeholder="Nhập tin nhắn...">
    
    <!-- Image input -->
    <input type="file" name="image" accept="image/*" id="imageInput">
    
    <button type="submit">Gửi</button>
</form>
```

#### **JavaScript Implementation**
```javascript
document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const conversationId = formData.get('conversationId');
    const content = formData.get('content');
    const imageFile = document.getElementById('imageInput').files[0];
    
    // Add data to FormData
    if (conversationId) formData.set('conversationId', conversationId);
    if (content) formData.set('content', content);
    if (imageFile) formData.set('image', imageFile);
    
    try {
        const response = await fetch('/api/v1/message/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        console.log('Message sent:', result);
        
        // Clear form
        e.target.reset();
        
    } catch (error) {
        console.error('Error sending message:', error);
    }
});
```

### 📊 **Database Storage**

#### **Message Model**
```typescript
{
    conversationId: ObjectId,
    senderId: ObjectId,
    content: String,              // Caption for image
    messageType: "text" | "image",
    imageUrl: String,             // Cloudinary URL
    // ... other fields
}
```

#### **Cloudinary URL Structure**
```
https://res.cloudinary.com/<cloud_name>/image/upload/v<timestamp>/message_images/<public_id>.<format>
```

### 🔒 **Security & Validation**

#### **Server-side Validation**
```typescript
// File filter - images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Chỉ chấp nhận file ảnh"));
    }
};

// Size limit
const limits = {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Only 1 image per message
};
```

#### **Client-side Validation**
```javascript
// File size check
function validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('File quá lớn. Tối đa 5MB');
        return false;
    }
    
    // File type check
    if (!file.type.startsWith('image/')) {
        alert('Chỉ chấp nhận file ảnh');
        return false;
    }
    
    return true;
}
```

### 🚀 **Performance Features**

#### **Cloudinary Optimizations**
- ✅ **Auto Quality**: Automatic quality adjustment
- ✅ **Auto Format**: Best format selection (webp, jpg, etc.)
- ✅ **Compression**: Reduced file size without quality loss
- ✅ **CDN Delivery**: Fast global content delivery

#### **Caching Strategy**
- Browser caching for static images
- Cloudinary CDN caching
- Client-side image caching

### 📱 **UI/UX Best Practices**

#### **Image Preview**
```javascript
// Show image preview before sending
document.getElementById('imageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.createElement('img');
            preview.src = e.target.result;
            preview.style.maxWidth = '200px';
            preview.style.maxHeight = '200px';
            
            // Show preview
            document.getElementById('imagePreview').innerHTML = '';
            document.getElementById('imagePreview').appendChild(preview);
        };
        reader.readAsDataURL(file);
    }
});
```

#### **Loading States**
```javascript
function sendMessage(formData) {
    // Show loading state
    const sendButton = document.querySelector('#sendButton');
    sendButton.disabled = true;
    sendButton.textContent = 'Đang gửi...';
    
    fetch('/api/v1/message/send', {
        method: 'POST',
        body: formData
    })
    .finally(() => {
        // Reset button state
        sendButton.disabled = false;
        sendButton.textContent = 'Gửi';
    });
}
```

### 🎯 **Build Status**
✅ TypeScript compilation successful  
✅ Cloudinary integration working  
✅ Image upload middleware complete  
✅ Real-time image delivery functional  
✅ Security measures implemented  

### 🔧 **Environment Variables Required**
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Hệ thống upload ảnh cho tin nhắn đã sẵn sàng với Cloudinary! 📸✨
