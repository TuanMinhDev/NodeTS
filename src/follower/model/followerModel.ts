import mongoose from "mongoose";

const followerSchema = new mongoose.Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    followers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }],
},
    { timestamps: true });

const Follower = mongoose.model("Follower", followerSchema);

export default Follower;
