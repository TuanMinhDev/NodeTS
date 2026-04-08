import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderCode: {
        type: String,
        required: true,
        unique: true,
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variant: {
            color: { type: String, required: true },
            size: { type: String, required: true },
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        price: {
            type: Number,
            required: true,
        },
    }],
    shippingMethod: {
        type: String,
        enum: ["economy", "fast", "express"],
        required: true,
    },
    shippingFee: {
        type: Number,
        required: true,
        default: 0,
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0,
    },
    shippingAddress: {
        fullName: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        district: { type: String, required: true },
        ward: { type: String, required: true },
    },
    status: {
        type: String,
        enum: ["pending", "shipping", "delivered", "cancelled"],
        default: "pending",
    },
    notes: {
        type: String,
        trim: true,
    },
},
    { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;