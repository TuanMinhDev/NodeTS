import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        size: { type: String, required: true },
        color: { type: String, required: true },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
    }],
    user: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
    },
    description: {
        type: String,
        default: "",
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0,
    },
    
},
    { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;