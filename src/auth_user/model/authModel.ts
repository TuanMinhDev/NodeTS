import mongoose from "mongoose";
const authSchema = new mongoose.Schema({
    user_name: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    /** Id phiên refresh hiện tại — null sau logout / đổi mật khẩu */
    refreshTokenId: {
        type: String,
        default: null,
    },
});

const Auth = mongoose.model("Auth", authSchema);

export default Auth;