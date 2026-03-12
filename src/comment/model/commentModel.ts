import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    images: {
        type: [String],
        default: [],
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    likes: [{
        type: String,
    }],
    replies: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }],
},
    { timestamps: true });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
