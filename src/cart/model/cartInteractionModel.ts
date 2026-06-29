import mongoose from "mongoose";

const cartInteractionSchema = new mongoose.Schema(
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
        addedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

cartInteractionSchema.index({ userId: 1, productId: 1, addedAt: -1 });
cartInteractionSchema.index({ addedAt: -1 });

const CartInteraction = mongoose.model(
    "CartInteraction",
    cartInteractionSchema,
    "cart_interactions"
);

export default CartInteraction;
