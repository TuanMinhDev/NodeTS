import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    messageType: {
        type: String,
        enum: ["text", "image"],
        default: "text",
    },
    imageUrl: {
        type: String,
        trim: true,
    },
    isRead: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        readAt: {
            type: Date,
            default: Date.now,
        },
    }],
    isDeleted: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        deletedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },
    editedAt: {
        type: Date,
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now,
        },
    }],
},
    { timestamps: true });

// Create indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ "isRead.userId": 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
