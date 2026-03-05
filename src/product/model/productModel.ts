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
        category: {
            type: String,
            enum: ["pants", "shirt", "shoes", "sandals", "hat", "jewelry"],
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