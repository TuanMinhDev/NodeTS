import mongoose from "mongoose";

const followerSchema = new mongoose.Schema({
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
},
    { timestamps: true });

// Create compound index to ensure a user can only follow a seller once
followerSchema.index({ userId: 1, sellerId: 1 }, { unique: true });

const Follower = mongoose.model("Follower", followerSchema);

export default Follower;
