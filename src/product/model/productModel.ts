import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        sale: {
            type: Number,
            default: null,
            min: 0,
        },

        variants: [{
            color: String,
            size: String,
            stock: Number,
            sold: Number,
            price: Number,
        }],
        images: {
            type: [String],
            default: [],
        },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;