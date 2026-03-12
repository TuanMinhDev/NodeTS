import { Request, Response } from "express";
import mongoose from "mongoose";
import Message from "../model/messageModel";
import Conversation from "../model/conversationModel";
import { sendMessage as sendRealTimeMessage, markMessagesAsRead } from "../service/messageService";
import { AuthedRequest } from "../../_component";

export const createConversation = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { participantId, isGroup, groupName, groupImage } = req.body;

        if (!participantId && !isGroup) {
            return res.status(400).json({ message: "participantId là bắt buộc cho cuộc trò chuyện 1-1" });
        }

        if (isGroup && !groupName) {
            return res.status(400).json({ message: "groupName là bắt buộc cho cuộc trò chuyện nhóm" });
        }

        // For 1-1 conversation, check if conversation already exists
        if (!isGroup && participantId) {
            const existingConversation = await Conversation.findOne({
                participants: { $all: [userId, participantId], $size: 2 },
                isGroup: false
            }).populate("participants");

            if (existingConversation) {
                return res.status(200).json({ 
                    message: "Cuộc trò chuyện đã tồn tại", 
                    conversation: existingConversation 
                });
            }
        }

        const participants = isGroup ? [userId, ...req.body.participants] : [userId, participantId];

        const conversation = new Conversation({
            participants,
            isGroup: isGroup || false,
            groupName: groupName || null,
            groupImage: groupImage || null,
            createdBy: userId,
        });

        await conversation.save();
        await conversation.populate("participants", "name email avatar");

        res.status(201).json({ message: "Tạo cuộc trò chuyện thành công", conversation });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getConversations = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const conversations = await Conversation.find({
            participants: userId,
            isActive: true
        })
        .populate("participants", "name email avatar")
        .populate("lastMessage")
        .sort({ lastMessageAt: -1 });

        res.status(200).json({ message: "Lấy danh sách cuộc trò chuyện thành công", conversations });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getConversationById = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;

        const conversation = await Conversation.findOne({
            _id: id,
            participants: userId,
            isActive: true
        })
        .populate("participants", "name email avatar")
        .populate("lastMessage");

        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        res.status(200).json({ message: "Lấy cuộc trò chuyện thành công", conversation });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const sendMessage = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { conversationId, content, messageType, imageUrl, replyTo } = req.body;

        // Handle image upload - imageUrl comes from middleware
        const finalImageUrl = imageUrl || null;
        const finalContent = content || (finalImageUrl ? "Đã gửi một hình ảnh" : "");
        const finalMessageType = finalImageUrl ? "image" : (messageType || "text");

        if (!conversationId || (!finalContent && !finalImageUrl)) {
            return res.status(400).json({ message: "conversationId và content hoặc imageUrl là bắt buộc" });
        }

        if (finalMessageType && !["text", "image"].includes(finalMessageType)) {
            return res.status(400).json({ message: "messageType chỉ có thể là 'text' hoặc 'image'" });
        }

        // Check if user is participant in conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
            isActive: true
        });

        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        const newMessage = new Message({
            conversationId,
            senderId: userId,
            content: finalContent,
            messageType: finalMessageType,
            imageUrl: finalImageUrl,
            replyTo: replyTo || null,
        });

        await newMessage.save();
        await newMessage.populate("senderId", "name email avatar");

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: newMessage._id,
            lastMessageAt: new Date(),
        });

        // Send real-time message to participants
        try {
            const participantIds = conversation.participants.map(p => p.toString());
            await sendRealTimeMessage(conversationId, newMessage, participantIds);
        } catch (notificationError) {
            console.error("Error sending real-time message:", notificationError);
        }

        res.status(201).json({ message: "Gửi tin nhắn thành công", messageData: newMessage });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMessages = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        if (!conversationId) {
            return res.status(400).json({ message: "conversationId là bắt buộc" });
        }

        // Check if user is participant in conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
            isActive: true
        });

        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        const skip = (Number(page) - 1) * Number(limit);

        const messages = await Message.find({
            conversationId,
            "isDeleted.userId": { $ne: userId } // Don't include messages deleted by this user
        })
        .populate("senderId", "name email avatar")
        .populate("replyTo", "content senderId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

        const total = await Message.countDocuments({
            conversationId,
            "isDeleted.userId": { $ne: userId }
        });

        res.status(200).json({
            message: "Lấy tin nhắn thành công",
            messages: messages.reverse(), // Reverse to show oldest first
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { conversationId } = req.params;
        const conversationIdStr = Array.isArray(conversationId) ? conversationId[0] : conversationId;
        const { messageIds } = req.body;

        if (!conversationIdStr) {
            return res.status(400).json({ message: "conversationId là bắt buộc" });
        }

        // Check if user is participant in conversation
        const conversation = await Conversation.findOne({
            _id: conversationIdStr,
            participants: userId,
            isActive: true
        });

        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        // Handle messageIds type - ensure it's string[] | undefined
        let messageIdsArray: string[] | undefined = undefined;
        if (Array.isArray(messageIds)) {
            messageIdsArray = messageIds as string[];
        } else if (messageIds) {
            messageIdsArray = [messageIds as string];
        }
        
        await markMessagesAsRead(conversationIdStr, userId as string, messageIdsArray);

        res.status(200).json({ message: "Đánh dấu đã đọc thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteMessage = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;

        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
        }

        // Check if user is sender or participant in conversation
        const conversation = await Conversation.findOne({
            _id: message.conversationId,
            participants: userId,
            isActive: true
        });

        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        // Add to deleted list
        message.isDeleted.push({ userId, deletedAt: new Date() });
        await message.save();

        res.status(200).json({ message: "Xóa tin nhắn thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const editMessage = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "content là bắt buộc" });
        }

        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
        }

        // Check if user is the sender
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ message: "Bạn chỉ có thể sửa tin nhắn của mình" });
        }

        // Add to edit history
        message.editHistory.push({
            content: message.content,
            editedAt: new Date(),
        });

        message.content = content;
        message.editedAt = new Date();
        await message.save();
        await message.populate("senderId", "name email avatar");

        res.status(200).json({ message: "Sửa tin nhắn thành công", messageData: message });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
