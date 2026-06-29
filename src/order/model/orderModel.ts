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
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId(),
            required: true,
        },
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
        enum: ["economy", "fast", "express", "ghtk", "pickup"],
        default: "ghtk",
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
        /** Tỉnh / thành phố (mô hình 2 cấp). */
        province: { type: String, trim: true, required: true },
        ward: { type: String, trim: true, required: true },
        /** Deprecated: FE cũ gửi `city` — API vẫn copy sang province khi tạo đơn. */
        city: { type: String, trim: true },
        /** Cấp hành chính cũ — optional. */
        district: { type: String, trim: true },
    },
    status: {
        type: String,
        enum: ["pending", "shipping", "delivered", "cancelled"],
        default: "pending",
    },
    /** Trạng thái vận chuyển chi tiết từ GHTK (pending, in_transit, delivered, ...) */
    shippingStatus: {
        type: String,
        default: null,
    },
    notes: {
        type: String,
        trim: true,
    },
},
    { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;