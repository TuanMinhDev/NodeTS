import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
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
    actionUrl: {
        type: String,
        trim: true,
    },
    actionText: {
        type: String,
        trim: true,
        maxlength: 50,
    },
    imageUrl: {
        type: String,
        trim: true,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    expiresAt: {
        type: Date,
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
    readAt: Date,
},
    { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

notificationSchema.pre("save", function(next: any) {
    if (this.isRead && !this.readAt) {
        this.readAt = new Date();
    }
    next();
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
