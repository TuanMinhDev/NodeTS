import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../model/notificationModel";
import { AuthedRequest } from "../../_component";

export const createNotification = async (req: AuthedRequest, res: Response) => {
    try {
        const { userId, title, content, type, relatedId, relatedModel, data } = req.body;

        if (!userId || !title || !content || !type) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        const notification = new Notification({
            userId,
            title,
            content,
            type,
            relatedId,
            relatedModel,
            data,
        });

        const savedNotification = await notification.save();
        res.status(201).json({ message: "Tạo thông báo thành công", notification: savedNotification });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNotifications = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { page = 1, limit = 10, isRead } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter: any = { userId };
        if (isRead !== undefined) {
            filter.isRead = isRead === "true";
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.status(200).json({
            message: "Lấy danh sách thông báo thành công",
            notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
            unreadCount,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }

        res.status(200).json({ message: "Đánh dấu đã đọc thành công", notification });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ message: "Đánh dấu tất cả đã đọc thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteNotification = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const notification = await Notification.findOneAndDelete({ _id: id, userId });

        if (!notification) {
            return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }

        res.status(200).json({ message: "Xóa thông báo thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
