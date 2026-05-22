import mongoose from "mongoose";

const commentItemSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
        orderItemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        img: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

const productCommentsSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        comment: [commentItemSchema],
    },
    { timestamps: true }
);

// Unique compound index to prevent duplicate reviews
// Using orderItemId if available, otherwise fallback to userId + orderId + productId
commentItemSchema.index({ userId: 1, orderItemId: 1 }, { unique: true, sparse: true });
commentItemSchema.index({ userId: 1, orderId: 1, productId: 1 }, { unique: true, sparse: true });

const Comment = mongoose.model("Comment", productCommentsSchema);

export default Comment;
