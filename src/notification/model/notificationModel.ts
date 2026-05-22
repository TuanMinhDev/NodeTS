import mongoose from "mongoose";

const notificationItemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        type: {
            type: String,
            enum: ["order", "payment", "promotion", "system", "comment", "favorite", "general"],
            required: true,
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "relatedModel",
        },
        relatedModel: {
            type: String,
            enum: ["Order", "Payment", "Product", "Comment", "User"],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        actionUrl: { type: String, trim: true, default: "" },
        actionText: { type: String, trim: true, maxlength: 50, default: "" },
        imageUrl: { type: String, trim: true, default: "" },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        expiresAt: Date,
        sentAt: { type: Date, default: Date.now },
        readAt: Date,
    },
    { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

/** Một user — một document; danh sách thông báo nằm trong `items`. */
const userNotificationInboxSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        items: {
            type: [notificationItemSchema],
            default: [],
        },
    },
    { timestamps: true }
);

userNotificationInboxSchema.index({ userId: 1 });

const UserNotificationInbox = mongoose.model("UserNotificationInbox", userNotificationInboxSchema);

export default UserNotificationInbox;
