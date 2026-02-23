import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    attributes: [
        {
            size: {
                type: String,
                required: true,
            },
            color: {
                type: String,
                required: true,
            },
            price: {
                type: Number,
                required: true,
            },
            stock: {
                type: Number,
                required: true,
                default: 0,
            },
            sold: {
                type: Number,
                default: 0,
            },
            image: {
                type: String,
                required: true,
            },

        }
    ],
    


},
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;