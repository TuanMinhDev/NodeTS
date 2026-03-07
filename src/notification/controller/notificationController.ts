import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../model/notificationModel";

type AuthedRequest = Request & { user?: { userId: string; role: string; id?: string } };

export const createNotification = async (req: AuthedRequest, res: Response) => {
    try {
        const { 
            title, 
            message, 
            type, 
            relatedId, 
            relatedModel, 
            priority, 
            actionUrl, 
            actionText, 
            imageUrl, 
            metadata, 
            expiresAt 
        } = req.body;
        const userId = req.user?.userId;
        
        if (!userId || !title || !message || !type) {
            res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ message: "userId không hợp lệ" });
            return;
        }

        const validTypes = ["order", "payment", "promotion", "system", "comment", "favorite", "general"];
        if (!validTypes.includes(type)) {
            res.status(400).json({ message: "Loại thông báo không hợp lệ" });
            return;
        }

        const validPriorities = ["low", "medium", "high", "urgent"];
        if (priority && !validPriorities.includes(priority)) {
            res.status(400).json({ message: "Mức độ ưu tiên không hợp lệ" });
            return;
        }

        const newNotification = new Notification({
            userId,
            title,
            message,
            type,
            relatedId,
            relatedModel,
            priority: priority || "medium",
            actionUrl: actionUrl || "",
            actionText: actionText || "",
            imageUrl: imageUrl || "",
            metadata: metadata || {},
            expiresAt: expiresAt || null,
        });

        const savedNotification = await newNotification.save();
        
        const populatedNotification = await Notification.findById(savedNotification._id)
            .populate("userId", "username email")
            .populate("relatedId");

        res.status(201).json(populatedNotification);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNotificationsByUser = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { page = 1, limit = 10, type, isRead, priority } = req.query;

        if (!userId) {
            res.status(401).json({ message: "Chưa xác thực" });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ message: "userId không hợp lệ" });
            return;
        }

        const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
        
        if (type) {
            const validTypes = ["order", "payment", "promotion", "system", "comment", "favorite", "general"];
            if (validTypes.includes(type as string)) {
                filter.type = type;
            }
        }
        
        if (isRead !== undefined) {
            filter.isRead = isRead === "true";
        }
        
        if (priority) {
            const validPriorities = ["low", "medium", "high", "urgent"];
            if (validPriorities.includes(priority as string)) {
                filter.priority = priority;
            }
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const notifications = await Notification.find(filter)
            .populate("relatedId")
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ 
            userId: new mongoose.Types.ObjectId(userId as string), 
            isRead: false 
        });

        res.status(200).json({
            notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            unreadCount
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNotificationById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id as string)) {
            res.status(400).json({ message: "ID thông báo không hợp lệ" });
            return;
        }

        const notification = await Notification.findById(id)
            .populate("userId", "username email")
            .populate("relatedId");

        if (!notification) {
            res.status(404).json({ message: "Không tìm thấy thông báo" });
            return;
        }

        res.status(200).json(notification);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id as string)) {
            res.status(400).json({ message: "ID thông báo không hợp lệ" });
            return;
        }

        const updatedNotification = await Notification.findByIdAndUpdate(
            id as string,
            { isRead: true, readAt: new Date() },
            { new: true }
        )
            .populate("userId", "username email")
            .populate("relatedId");

        if (!updatedNotification) {
            res.status(404).json({ message: "Không tìm thấy thông báo" });
            return;
        }

        res.status(200).json(updatedNotification);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId as string)) {
            res.status(400).json({ message: "userId không hợp lệ" });
            return;
        }

        const result = await Notification.updateMany(
            { userId: new mongoose.Types.ObjectId(userId as string), isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.status(200).json({ 
            message: "Đánh dấu tất cả thông báo đã đọc thành công",
            modifiedCount: result.modifiedCount 
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id as string)) {
            res.status(400).json({ message: "ID thông báo không hợp lệ" });
            return;
        }

        const deletedNotification = await Notification.findByIdAndDelete(id as string);

        if (!deletedNotification) {
            res.status(404).json({ message: "Không tìm thấy thông báo để xóa" });
            return;
        }

        res.status(200).json({ message: "Xóa thông báo thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const clearAllNotifications = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId as string)) {
            res.status(400).json({ message: "userId không hợp lệ" });
            return;
        }

        const result = await Notification.deleteMany({ 
            userId: new mongoose.Types.ObjectId(userId as string) 
        });

        res.status(200).json({ 
            message: "Xóa tất cả thông báo thành công",
            deletedCount: result.deletedCount 
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId as string)) {
            res.status(400).json({ message: "userId không hợp lệ" });
            return;
        }

        const unreadCount = await Notification.countDocuments({ 
            userId: new mongoose.Types.ObjectId(userId as string), 
            isRead: false 
        });

        const priorityCounts = await Notification.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId as string), isRead: false } },
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            }
        ]);

        const typeCounts = await Notification.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId as string), isRead: false } },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            unreadCount,
            priorityCounts: priorityCounts.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            typeCounts: typeCounts.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBulkNotifications = async (req: Request, res: Response) => {
    try {
        const { userIds, title, message, type, priority, actionUrl, actionText, imageUrl, metadata, expiresAt } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !title || !message || !type) {
            res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
            return;
        }

        const validTypes = ["order", "payment", "promotion", "system", "comment", "favorite", "general"];
        if (!validTypes.includes(type)) {
            res.status(400).json({ message: "Loại thông báo không hợp lệ" });
            return;
        }

        const validPriorities = ["low", "medium", "high", "urgent"];
        if (priority && !validPriorities.includes(priority)) {
            res.status(400).json({ message: "Mức độ ưu tiên không hợp lệ" });
            return;
        }

        const notifications = userIds.map((userId: string) => ({
            userId,
            title,
            message,
            type,
            priority: priority || "medium",
            actionUrl: actionUrl || "",
            actionText: actionText || "",
            imageUrl: imageUrl || "",
            metadata: metadata || {},
            expiresAt: expiresAt || null,
        }));

        const savedNotifications = await Notification.insertMany(notifications);

        res.status(201).json({
            message: "Tạo thông báo hàng loạt thành công",
            count: savedNotifications.length,
            notifications: savedNotifications
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
