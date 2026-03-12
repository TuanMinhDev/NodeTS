# 📱 Simple Real-time Messaging System

## ✅ **Simplified Features - Text & Images Only**

### 🎯 **Supported Message Types**
- ✅ **Text Messages**: Plain text chat
- ✅ **Image Messages**: Image sharing with URL
- ❌ **File Messages**: Removed (not supported)
- ❌ **System Messages**: Removed (not supported)

### 📊 **Simplified Database Schema**

#### **Message Model**
```typescript
{
    conversationId: ObjectId,      // Parent conversation
    senderId: ObjectId,           // Message sender
    content: String,              // Text content (required for text messages)
    messageType: "text" | "image", // Only text or image
    imageUrl: String,              // Image URL (for image messages)
    isRead: [{                    // Read receipts
        userId: ObjectId,
        readAt: Date
    }],
    isDeleted: [{                 // Soft delete
        userId: ObjectId,
        deletedAt: Date
    }],
    replyTo: ObjectId,           // Reply to message
    editedAt: Date,               // Last edit time
    editHistory: [{               // Edit history
        content: String,
        editedAt: Date
    }]
}
```

## 🛣️ **API Usage**

### **Send Text Message**
```bash
POST /api/v1/message/send
{
  "conversationId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "content": "Hello there!",
  "messageType": "text"
}
```

### **Send Image Message**
```bash
POST /api/v1/message/send
{
  "conversationId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "content": "Check out this image!",
  "messageType": "image",
  "imageUrl": "https://example.com/image.jpg"
}
```

## 🔌 **Socket.IO Events**

### **New Message Event**
```javascript
socket.on("newMessage", (message) => {
    console.log("New message:", message);
    // message structure:
    {
        _id: "message_id",
        conversationId: "conversation_id", 
        senderId: "sender_id",
        content: "Hello there!",
        messageType: "text", // or "image"
        imageUrl: null, // or image URL
        replyTo: null, // or replied message ID
        createdAt: "2024-01-01T00:00:00.000Z",
        sender: { populated sender data }
    }
});
```

## 🚀 **Client Implementation**

### **Send Text Message**
```javascript
// Send text message
await fetch('/api/v1/message/send', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
        conversationId: 'conv_id',
        content: 'Hello!',
        messageType: 'text'
    })
});
```

### **Send Image Message**
```javascript
// Send image message (after uploading image to cloud storage)
await fetch('/api/v1/message/send', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
        conversationId: 'conv_id',
        content: 'Check this out!',
        messageType: 'image',
        imageUrl: 'https://cloudinary.com/image.jpg'
    })
});
```

### **Real-time Updates**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Join conversation
socket.emit('joinConversation', conversationId);

// Listen for new messages
socket.on('newMessage', (message) => {
    if (message.messageType === 'text') {
        // Display text message
        console.log(message.content);
    } else if (message.messageType === 'image') {
        // Display image message
        console.log('Image:', message.imageUrl);
        console.log('Caption:', message.content);
    }
});
```

## 🎨 **UI Implementation Tips**

### **Message Rendering**
```javascript
function renderMessage(message) {
    if (message.messageType === 'text') {
        return `
            <div class="message text-message">
                <p>${message.content}</p>
                <span class="time">${formatTime(message.createdAt)}</span>
            </div>
        `;
    } else if (message.messageType === 'image') {
        return `
            <div class="message image-message">
                <img src="${message.imageUrl}" alt="Image" />
                <p>${message.content}</p>
                <span class="time">${formatTime(message.createdAt)}</span>
            </div>
        `;
    }
}
```

### **Message Input**
```javascript
function sendMessage() {
    const content = document.getElementById('messageInput').value;
    const messageType = 'text';
    
    fetch('/api/v1/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            conversationId,
            content,
            messageType
        })
    });
}
```

## 🔒 **Security & Validation**

- **Message Type Validation**: Only accepts "text" or "image"
- **Content Validation**: Text messages require content, image messages require imageUrl
- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Users can only send messages to conversations they participate in

## 📱 **Features Retained**

✅ **Real-time delivery** - Instant message sending  
✅ **Read receipts** - Mark messages as read  
✅ **Typing indicators** - Show when someone is typing  
✅ **Edit messages** - Edit sent messages with history  
✅ **Delete messages** - Soft delete messages  
✅ **Reply messages** - Reply to specific messages  
✅ **Conversations** - 1-1 and group chats  

## ❌ **Features Removed**

❌ **File sharing** - No document/file uploads  
❌ **System messages** - No automated system messages  
❌ **Complex file handling** - Simplified to just image URLs  

## 🎯 **Build Status**
✅ TypeScript compilation successful  
✅ Simplified message model implemented  
✅ Only text and image messaging supported  
✅ Real-time features working  
✅ All security measures in place  

Perfect for simple chat applications that only need text and image messaging! 🚀
