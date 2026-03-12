import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import Notification from "../model/notificationModel";
import Follower from "../../follower/model/followerModel";

let io: SocketIOServer;

export const initializeSocketIO = (server: HTTPServer): SocketIOServer => {
    io = new SocketIOServer(server, {
        cors: {
            origin: "*",
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
        const notification = new Notification(notificationData);
        await notification.save();

        // Send real-time notification if user is online
        if (io) {
            io.to(`user_${notificationData.userId}`).emit("newNotification", {
                _id: notification._id,
                title: notification.title,
                content: notification.content,
                type: notification.type,
                relatedId: notification.relatedId,
                relatedModel: notification.relatedModel,
                data: notification.data,
                isRead: notification.isRead,
                createdAt: notification.createdAt
            });
        }

        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};

export const notifyProductCreated = async (sellerId: string, productId: string, productName: string) => {
    try {
        // Get all followers of this seller
        const followers = await Follower.find({ sellerId }).populate("userId");
        
        // Notify all followers about new product
        const notifications = followers.map(follower => ({
            userId: follower.userId.toString(),
            title: "Sản phẩm mới",
            content: `${productName} vừa được đăng bán bởi seller bạn theo dõi`,
            type: "product",
            relatedId: productId,
            relatedModel: "Product",
            data: { productId, productName }
        }));

        // Create notifications for all followers
        await Promise.all(notifications.map(notif => createNotification(notif)));

        // Notify seller about successful product creation
        await createNotification({
            userId: sellerId,
            title: "Tạo sản phẩm thành công",
            content: `Sản phẩm ${productName} đã được tạo thành công`,
            type: "system",
            relatedId: productId,
            relatedModel: "Product",
            data: { productId, productName }
        });

        console.log(`Notified ${followers.length} followers about new product: ${productName}`);
    } catch (error) {
        console.error("Error notifying product created:", error);
    }
};

export const notifyOrderCreated = async (sellerId: string, buyerId: string, orderId: string, orderCode: string) => {
    try {
        // Notify seller about new order
        await createNotification({
            userId: sellerId,
            title: "Đơn hàng mới",
            content: `Bạn có đơn hàng mới: ${orderCode}`,
            type: "order",
            relatedId: orderId,
            relatedModel: "Order",
            data: { orderId, orderCode, buyerId }
        });

        // Notify buyer about successful order placement
        await createNotification({
            userId: buyerId,
            title: "Đặt hàng thành công",
            content: `Đơn hàng ${orderCode} đã được đặt thành công`,
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
            case "confirmed":
                title = "Đơn hàng được xác nhận";
                content = `Đơn hàng ${orderCode} đã được seller xác nhận`;
                break;
            case "preparing":
                title = "Đơn hàng đang chuẩn bị";
                content = `Đơn hàng ${orderCode} đang được chuẩn bị`;
                break;
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
