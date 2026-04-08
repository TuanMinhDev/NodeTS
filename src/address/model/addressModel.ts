import mongoose from "mongoose";

const addressItemSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
    },
    province: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    ward:     { type: String, required: true, trim: true },
    street:   { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    type: {
        type: String,
        enum: ["home", "office", "warehouse"],
        default: "home",
    },
}, { _id: true });

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    addresses: {
        type: [addressItemSchema],
        default: [],
    },
},
    { timestamps: true });

const Address = mongoose.model("Address", addressSchema);

export default Address;
