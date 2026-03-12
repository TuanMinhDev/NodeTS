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
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["order", "promotion", "system", "comment", "like"],
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "relatedModel",
    },
    relatedModel: {
        type: String,
        enum: ["Order", "Product", "Comment"],
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
    },
},
    { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
