import { Response } from "express";
import Message from "../model/messageModel";
import Conversation from "../model/conversationModel";
import { sendMessage as sendRealTimeMessage, markMessagesAsRead } from "../service/messageService";
import { AuthedRequest } from "../../_component";
import {
    getOrCreateUserAdminConversation,
    isConversationParticipant,
} from "../util/adminConversation.util";

const getAuthUserId = (req: AuthedRequest) => req.user?.userId || req.user?.id;

export const getMyConversation = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        if (req.user?.role !== "user") {
            return res.status(403).json({ message: "Chỉ user mới dùng endpoint này. Admin dùng GET /conversations" });
        }

        const conversation = await getOrCreateUserAdminConversation(userId);

        res.status(200).json({
            message: "Lấy cuộc trò chuyện với admin thành công",
            conversation,
        });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};

export const getConversations = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        if (req.user?.role === "user") {
            const conversation = await getOrCreateUserAdminConversation(userId);
            return res.status(200).json({
                message: "Lấy danh sách cuộc trò chuyện thành công",
                conversations: [conversation],
            });
        }

        const conversations = await Conversation.find({ isActive: true })
            .populate("userId", "name email phoneNumber role")
            .populate("participants", "name email role")
            .populate("lastMessage")
            .sort({ lastMessageAt: -1, updatedAt: -1 });

        res.status(200).json({
            message: "Lấy danh sách cuộc trò chuyện thành công",
            conversations,
        });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};

export const getConversationById = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;

        const conversation = await Conversation.findOne({
            _id: id,
            isActive: true,
        })
            .populate("userId", "name email phoneNumber role")
            .populate("participants", "name email role")
            .populate("lastMessage");

        if (!conversation || !isConversationParticipant(conversation, userId)) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        res.status(200).json({ message: "Lấy cuộc trò chuyện thành công", conversation });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};

export const sendMessage = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        let { conversationId, content, messageType, imageUrl, videoUrl, replyTo } = req.body;

        const finalImageUrl = imageUrl || null;
        const finalVideoUrl = videoUrl || null;

        let finalMessageType = messageType || "text";
        if (finalVideoUrl) finalMessageType = "video";
        else if (finalImageUrl) finalMessageType = "image";

        const defaultContent =
            finalMessageType === "video"
                ? "Đã gửi một video"
                : finalMessageType === "image"
                    ? "Đã gửi một hình ảnh"
                    : "";

        const finalContent = content?.trim() || defaultContent;

        if (!["text", "image", "video"].includes(finalMessageType)) {
            return res.status(400).json({ message: "messageType chỉ có thể là 'text', 'image' hoặc 'video'" });
        }

        if (finalMessageType === "text" && !finalContent) {
            return res.status(400).json({ message: "content là bắt buộc với tin nhắn text" });
        }

        if (finalMessageType === "image" && !finalImageUrl) {
            return res.status(400).json({ message: "imageUrl hoặc file ảnh là bắt buộc" });
        }

        if (finalMessageType === "video" && !finalVideoUrl) {
            return res.status(400).json({ message: "videoUrl hoặc file video là bắt buộc" });
        }

        let conversation;

        if (req.user?.role === "user") {
            conversation = await getOrCreateUserAdminConversation(userId);
            conversationId = conversation._id.toString();
        } else {
            if (!conversationId) {
                return res.status(400).json({ message: "Admin cần truyền conversationId để trả lời user" });
            }

            conversation = await Conversation.findOne({
                _id: conversationId,
                isActive: true,
            });

            if (!conversation || !isConversationParticipant(conversation, userId)) {
                return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
            }
        }

        const newMessage = new Message({
            conversationId,
            senderId: userId,
            content: finalContent,
            messageType: finalMessageType,
            imageUrl: finalImageUrl,
            videoUrl: finalVideoUrl,
            replyTo: replyTo || null,
        });

        await newMessage.save();
        await newMessage.populate("senderId", "name email role");

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: newMessage._id,
            lastMessageAt: new Date(),
        });

        try {
            const participantIds = conversation.participants.map((p) => p.toString());
            await sendRealTimeMessage(conversationId, newMessage, participantIds);
        } catch (notificationError) {
            console.error("Error sending real-time message:", notificationError);
        }

        res.status(201).json({ message: "Gửi tin nhắn thành công", messageData: newMessage });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};

export const getMessages = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        if (!conversationId) {
            return res.status(400).json({ message: "conversationId là bắt buộc" });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            isActive: true,
        });

        if (!conversation || !isConversationParticipant(conversation, userId)) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        const skip = (Number(page) - 1) * Number(limit);

        const messages = await Message.find({
            conversationId,
            "isDeleted.userId": { $ne: userId },
        })
            .populate("senderId", "name email role")
            .populate("replyTo", "content senderId messageType imageUrl videoUrl")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Message.countDocuments({
            conversationId,
            "isDeleted.userId": { $ne: userId },
        });

        res.status(200).json({
            message: "Lấy tin nhắn thành công",
            messages: messages.reverse(),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};

export const markAsRead = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { conversationId } = req.params;
        const conversationIdStr = Array.isArray(conversationId) ? conversationId[0] : conversationId;
        const { messageIds } = req.body;

        if (!conversationIdStr) {
            return res.status(400).json({ message: "conversationId là bắt buộc" });
        }

        const conversation = await Conversation.findOne({
            _id: conversationIdStr,
            isActive: true,
        });

        if (!conversation || !isConversationParticipant(conversation, userId)) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        let messageIdsArray: string[] | undefined;
        if (Array.isArray(messageIds)) {
            messageIdsArray = messageIds as string[];
        } else if (messageIds) {
            messageIdsArray = [messageIds as string];
        }

        await markMessagesAsRead(conversationIdStr, userId as string, messageIdsArray);

        res.status(200).json({ message: "Đánh dấu đã đọc thành công" });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};

export const deleteMessage = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;

        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
        }

        const conversation = await Conversation.findOne({
            _id: message.conversationId,
            isActive: true,
        });

        if (!conversation || !isConversationParticipant(conversation, userId)) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        message.isDeleted.push({ userId, deletedAt: new Date() });
        await message.save();

        res.status(200).json({ message: "Xóa tin nhắn thành công" });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};

export const editMessage = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const { content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ message: "content là bắt buộc" });
        }

        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
        }

        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ message: "Bạn chỉ có thể sửa tin nhắn của mình" });
        }

        if (message.messageType !== "text") {
            return res.status(400).json({ message: "Chỉ có thể sửa tin nhắn text" });
        }

        message.editHistory.push({
            content: message.content,
            editedAt: new Date(),
        });

        message.content = content.trim();
        message.editedAt = new Date();
        await message.save();
        await message.populate("senderId", "name email role");

        res.status(200).json({ message: "Sửa tin nhắn thành công", messageData: message });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi server" });
    }
};
