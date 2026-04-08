import { Response } from "express";
import mongoose from "mongoose";
import Follower from "../model/followerModel";
import User from "../../auth_user/model/userModel";
import { AuthedRequest } from "../../_component";

const paramId = (v: string | string[] | undefined): string | undefined =>
    v === undefined ? undefined : Array.isArray(v) ? v[0] : v;

export const followSeller = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { sellerId } = req.body;

        if (!sellerId) {
            return res.status(400).json({ message: "sellerId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        if (userId === sellerId) {
            return res.status(400).json({ message: "Không thể theo dõi chính mình" });
        }

        const seller = await User.findOne({ _id: sellerId, role: "seller" });
        if (!seller) {
            return res.status(404).json({ message: "Không tìm thấy seller" });
        }

        let doc = await Follower.findOne({ sellerId });

        if (!doc) {
            doc = await Follower.create({ sellerId, followers: [{ userId }] });
            return res.status(201).json({ message: "Theo dõi seller thành công" });
        }

        const alreadyFollowing = doc.followers.some((f: any) => f.userId.toString() === userId);
        if (alreadyFollowing) {
            return res.status(400).json({ message: "Bạn đã theo dõi seller này" });
        }

        doc.followers.push({ userId } as any);
        await doc.save();

        return res.status(201).json({ message: "Theo dõi seller thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const unfollowSeller = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const sellerId = paramId(req.params.sellerId);

        if (!sellerId) {
            return res.status(400).json({ message: "sellerId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        const doc = await Follower.findOne({ sellerId });
        if (!doc) {
            return res.status(404).json({ message: "Bạn chưa theo dõi seller này" });
        }

        const before = doc.followers.length;
        doc.followers = doc.followers.filter((f: any) => f.userId.toString() !== userId) as any;

        if (doc.followers.length === before) {
            return res.status(404).json({ message: "Bạn chưa theo dõi seller này" });
        }

        await doc.save();
        return res.status(200).json({ message: "Bỏ theo dõi seller thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách seller mà user đang theo dõi
export const getFollowedSellers = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const docs = await Follower.find({ "followers.userId": userId })
            .populate("sellerId", "name email")
            .sort({ createdAt: -1 });

        const sellers = docs.map((d: any) => d.sellerId);

        return res.status(200).json({ message: "Lấy danh sách seller đã theo dõi thành công", sellers });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách người theo dõi của 1 seller
export const getSellerFollowers = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const sellerId = paramId(req.params.sellerId);

        if (!sellerId) {
            return res.status(400).json({ message: "sellerId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        if (userId !== sellerId && req.user?.role !== "admin") {
            return res.status(403).json({ message: "Bạn không có quyền xem danh sách người theo dõi" });
        }

        const doc = await Follower.findOne({ sellerId })
            .populate("followers.userId", "name email");

        if (!doc) {
            return res.status(200).json({
                message: "Lấy danh sách người theo dõi thành công",
                totalFollowers: 0,
                followers: [],
            });
        }

        return res.status(200).json({
            message: "Lấy danh sách người theo dõi thành công",
            totalFollowers: doc.followers.length,
            followers: doc.followers,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const checkFollowStatus = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const sellerId = paramId(req.params.sellerId);

        if (!sellerId) {
            return res.status(400).json({ message: "sellerId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        const doc = await Follower.findOne({ sellerId });
        const isFollowing = doc?.followers.some((f: any) => f.userId.toString() === userId) ?? false;

        return res.status(200).json({ isFollowing });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
