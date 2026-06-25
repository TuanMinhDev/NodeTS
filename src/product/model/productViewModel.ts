import mongoose from "mongoose";

const productViewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
        source: {
            type: String,
            default: "detail_page",
            trim: true,
        },
    },
    { timestamps: false }
);

productViewSchema.index({ userId: 1, productId: 1, viewedAt: -1 });
productViewSchema.index({ viewedAt: -1 });

const ProductView = mongoose.model("ProductView", productViewSchema, "product_views");

export default ProductView;
