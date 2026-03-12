import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },
    lastMessageAt: {
        type: Date,
    },
    isGroup: {
        type: Boolean,
        default: false,
    },
    groupName: {
        type: String,
        trim: true,
    },
    groupImage: {
        type: String,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
},
    { timestamps: true });

// Create index for finding conversations by participants
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
