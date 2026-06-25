import { Server as SocketIOServer } from "socket.io";
import Message from "../model/messageModel";
import Conversation from "../model/conversationModel";

let io: SocketIOServer;

export const initializeMessageSocket = (socketIO: SocketIOServer) => {
    io = socketIO;
};

const buildMessagePayload = (message: {
    _id: unknown;
    conversationId: unknown;
    senderId: unknown;
    content: string;
    messageType: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    replyTo?: unknown;
    createdAt?: Date;
}) => ({
    _id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    messageType: message.messageType,
    imageUrl: message.imageUrl ?? null,
    videoUrl: message.videoUrl ?? null,
    replyTo: message.replyTo ?? null,
    createdAt: message.createdAt,
    sender: message.senderId,
});

export const sendMessage = async (conversationId: string, message: any, participants: string[]) => {
    try {
        if (!io) return;

        const payload = buildMessagePayload(message);

        participants.forEach((participantId: string) => {
            io.to(`user_${participantId}`).emit("newMessage", payload);
        });

        io.to(`conversation_${conversationId}`).emit("newMessage", payload);

        console.log(`Message sent to conversation ${conversationId} with ${participants.length} participants`);
    } catch (error) {
        console.error("Error sending real-time message:", error);
    }
};

export const markMessagesAsRead = async (conversationId: string, userId: string, messageIds?: string[]) => {
    try {
        const filter: Record<string, unknown> = {
            conversationId,
            senderId: { $ne: userId },
            "isRead.userId": { $ne: userId },
        };

        if (messageIds && messageIds.length > 0) {
            filter._id = { $in: messageIds };
        }

        const update = {
            $push: {
                isRead: {
                    userId,
                    readAt: new Date(),
                },
            },
        };

        await Message.updateMany(filter, update);

        if (io) {
            io.to(`user_${userId}`).emit("messagesRead", {
                conversationId,
                messageIds,
                userId,
            });
        }

        console.log(`Messages marked as read by user ${userId} in conversation ${conversationId}`);
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
};

export const notifyTyping = (conversationId: string, userId: string, isTyping: boolean) => {
    try {
        if (!io) return;

        Conversation.findById(conversationId)
            .then((conversation) => {
                if (conversation) {
                    conversation.participants.forEach((participantId) => {
                        const participantIdStr = participantId.toString();
                        if (participantIdStr !== userId) {
                            io.to(`user_${participantIdStr}`).emit("userTyping", {
                                conversationId,
                                userId,
                                isTyping,
                            });
                        }
                    });
                }
            })
            .catch((error) => console.error("Error notifying typing:", error));
    } catch (error) {
        console.error("Error notifying typing:", error);
    }
};
