import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import UserNotificationInbox from "../model/notificationModel";

let io: SocketIOServer;

export const initializeSocketIO = (server: HTTPServer): SocketIOServer => {
    io = new SocketIOServer(server, {
        cors: {
            origin: ["http://localhost:3000", "http://192.168.1.47:3000", "http://localhost:5173"],
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join user to their personal room
        socket.on("joinUserRoom", (userId) => {
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined their room`);
        });

        // Join conversation room for messaging
        socket.on("joinConversation", (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(`User joined conversation: ${conversationId}`);
        });

        // Leave conversation room
        socket.on("leaveConversation", (conversationId) => {
            socket.leave(`conversation_${conversationId}`);
            console.log(`User left conversation: ${conversationId}`);
        });

        // Handle typing events
        socket.on("typing", (data) => {
            socket.to(`conversation_${data.conversationId}`).emit("userTyping", {
                conversationId: data.conversationId,
                userId: data.userId,
                isTyping: true
            });
        });

        socket.on("stopTyping", (data) => {
            socket.to(`conversation_${data.conversationId}`).emit("userTyping", {
                conversationId: data.conversationId,
                userId: data.userId,
                isTyping: false
            });
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const createNotification = async (notificationData: {
    userId: string;
    title: string;
    content: string;
    type: string;
    relatedId?: string;
    relatedModel?: string;
    data?: any;
}) => {
    try {
        const item = {
            title: notificationData.title,
            message: notificationData.content,
            type: notificationData.type,
            ...(notificationData.relatedId && { relatedId: notificationData.relatedId }),
            ...(notificationData.relatedModel && { relatedModel: notificationData.relatedModel }),
            metadata: notificationData.data ?? {},
        };

        const inbox = await UserNotificationInbox.findOneAndUpdate(
            { userId: notificationData.userId },
            { $push: { items: item }, $setOnInsert: { userId: notificationData.userId } },
            { new: true, upsert: true }
        );

        const newItem = inbox.items[inbox.items.length - 1];

        // Send real-time notification if user is online
        if (io && newItem) {
            io.to(`user_${notificationData.userId}`).emit("newNotification", {
                _id: newItem._id,
                title: newItem.title,
                message: newItem.message,
                type: newItem.type,
                relatedId: newItem.relatedId,
                relatedModel: newItem.relatedModel,
                metadata: newItem.metadata,
                isRead: newItem.isRead,
                sentAt: newItem.sentAt,
                createdAt: (newItem as any).createdAt,
            });
        }

        return newItem;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};

export const notifyProductCreated = async (sellerId: string, productId: string, productName: string) => {
    try {
        await createNotification({
            userId: sellerId,
            title: "Tạo sản phẩm thành công",
            content: `Sản phẩm ${productName} đã được tạo thành công`,
            type: "system",
            relatedId: productId,
            relatedModel: "Product",
            data: { productId, productName }
        });
    } catch (error) {
        console.error("Error notifying product created:", error);
    }
};

export const notifyOrderCreated = async (sellerId: string, buyerId: string, orderId: string, orderCode: string) => {
    try {
        // Người bán: đơn hàng mới
        await createNotification({
            userId: sellerId,
            title: "Bạn có đơn hàng mới",
            content: `Mã đơn: ${orderCode}. Mở ứng dụng để xem chi tiết.`,
            type: "order",
            relatedId: orderId,
            relatedModel: "Order",
            data: { orderId, orderCode, buyerId }
        });

        // Người mua: đặt hàng thành công
        await createNotification({
            userId: buyerId,
            title: "Đặt đơn hàng thành công",
            content: `Bạn đã đặt đơn hàng thành công. Mã đơn: ${orderCode}.`,
            type: "order",
            relatedId: orderId,
            relatedModel: "Order",
            data: { orderId, orderCode }
        });

        console.log(`Notified seller ${sellerId} and buyer ${buyerId} about order: ${orderCode}`);
    } catch (error) {
        console.error("Error notifying order created:", error);
    }
};

export const notifyOrderStatusUpdated = async (buyerId: string, orderId: string, orderCode: string, status: string) => {
    try {
        let title, content;
        
        switch (status) {
            case "shipping":
                title = "Đơn hàng đang giao";
                content = `Đơn hàng ${orderCode} đang được giao đến bạn`;
                break;
            case "delivered":
                title = "Đơn hàng giao thành công";
                content = `Đơn hàng ${orderCode} đã được giao thành công`;
                break;
            case "cancelled":
                title = "Đơn hàng bị hủy";
                content = `Đơn hàng ${orderCode} đã bị hủy`;
                break;
            default:
                title = "Cập nhật đơn hàng";
                content = `Đơn hàng ${orderCode} đã được cập nhật`;
        }

        await createNotification({
            userId: buyerId,
            title,
            content,
            type: "order",
            relatedId: orderId,
            relatedModel: "Order",
            data: { orderId, orderCode, status }
        });

        console.log(`Notified buyer ${buyerId} about order status update: ${orderCode} - ${status}`);
    } catch (error) {
        console.error("Error notifying order status updated:", error);
    }
};
