import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ["admin", "seller", "user"],
        default: "user",
    },
    phoneNumber: {
        type: String,
        trim: true,
        required: true,
        unique: true,
    },
},
    { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;