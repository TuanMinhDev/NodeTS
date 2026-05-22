import { Response } from "express";
import mongoose from "mongoose";
import UserNotificationInbox from "../model/notificationModel";
import { AuthedRequest } from "../../_component";

export const getNotifications = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { page = 1, limit = 10, isRead } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const userObjectId = new mongoose.Types.ObjectId(userId as string);

        const matchItems: Record<string, unknown> = {};
        if (isRead !== undefined) {
            matchItems["items.isRead"] = isRead === "true";
        }

        const basePipeline: mongoose.PipelineStage[] = [
            { $match: { userId: userObjectId } },
            { $unwind: "$items" },
        ];
        if (Object.keys(matchItems).length) {
            basePipeline.push({ $match: matchItems });
        }

        const listPipeline: mongoose.PipelineStage[] = [
            ...basePipeline,
            { $sort: { "items.sentAt": -1, "items._id": -1 } },
            { $skip: skip },
            { $limit: Number(limit) },
            { $replaceRoot: { newRoot: "$items" } },
        ];

        const countPipeline: mongoose.PipelineStage[] = [
            ...basePipeline,
            { $count: "total" },
        ];

        const unreadPipeline: mongoose.PipelineStage[] = [
            { $match: { userId: userObjectId } },
            { $unwind: "$items" },
            { $match: { "items.isRead": false } },
            { $count: "total" },
        ];

        const [notifications, countAgg, unreadAgg] = await Promise.all([
            UserNotificationInbox.aggregate(listPipeline),
            UserNotificationInbox.aggregate(countPipeline),
            UserNotificationInbox.aggregate(unreadPipeline),
        ]);

        const total = countAgg[0]?.total ?? 0;
        const unreadCount = unreadAgg[0]?.total ?? 0;

        res.status(200).json({
            message: "Lấy danh sách thông báo thành công",
            notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)) || 0,
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

        const id = String(req.params.id);
        const inbox = await UserNotificationInbox.findOneAndUpdate(
            { userId, "items._id": id },
            {
                $set: {
                    "items.$.isRead": true,
                    "items.$.readAt": new Date(),
                },
            },
            { new: true }
        );

        if (!inbox) {
            return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }

        const notification = inbox.items.id(id);
        res.status(200).json({ message: "Đánh dấu đã đọc thành công", notification });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const inbox = await UserNotificationInbox.findOne({ userId });
        if (inbox) {
            const now = new Date();
            for (const item of inbox.items) {
                if (!item.isRead) {
                    item.isRead = true;
                    item.readAt = now;
                }
            }
            await inbox.save();
        }

        res.status(200).json({ message: "Đánh dấu tất cả đã đọc thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteNotification = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const id = String(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Id không hợp lệ" });
        }

        const result = await UserNotificationInbox.updateOne(
            { userId, "items._id": id },
            { $pull: { items: { _id: id } } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }

        res.status(200).json({ message: "Xóa thông báo thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
