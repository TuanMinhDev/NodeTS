import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
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
    address: {
        type: String,
        required: true,
        trim: true,
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    district: {
        type: String,
        required: true,
        trim: true,
    },
    ward: {
        type: String,
        required: true,
        trim: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
},
    { timestamps: true });

const Address = mongoose.model("Address", addressSchema);

export default Address;
