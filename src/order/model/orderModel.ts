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
    totalPrice: {
        type: Number,
        required: true,
        default: 0,
    },
    status: {
        type: Number,
        enum: [0,1,2,3,4,5],
        // 0: từ chối
        // 1: chờ xác nhận
        // 2: đang chuẩn bị hàng
        // 3: đang giao hàng
        // 4: giao thành công
        // 5: trả hàng
        default: 1,
    },
},
    { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;