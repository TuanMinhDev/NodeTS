import User from "../../auth_user/model/userModel";
import Conversation from "../model/conversationModel";

export const findSystemAdmin = async () => {
    const admin = await User.findOne({ role: "admin" }).select("_id name email role");
    if (!admin) {
        throw new Error("Chưa có tài khoản admin trên hệ thống");
    }
    return admin;
};

export const getOrCreateUserAdminConversation = async (userId: string) => {
    const existing = await Conversation.findOne({ userId, isActive: true })
        .populate("participants", "name email role")
        .populate("lastMessage");

    if (existing) {
        return existing;
    }

    const admin = await findSystemAdmin();

    if (admin._id.toString() === userId) {
        throw new Error("Admin không thể tạo cuộc trò chuyện hỗ trợ với chính mình");
    }

    const conversation = new Conversation({
        userId,
        participants: [userId, admin._id],
        createdBy: userId,
    });

    await conversation.save();
    await conversation.populate("participants", "name email role");

    return conversation;
};

export const isConversationParticipant = (
    conversation: { participants: { toString(): string }[] },
    userId: string
) => conversation.participants.some((p) => p.toString() === userId);
