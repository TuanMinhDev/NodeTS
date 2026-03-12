import { Request, Response } from "express";
import mongoose from "mongoose";
import Follower from "../model/followerModel";
import User from "../../auth_user/model/userModel";
import { AuthedRequest } from "../../_component";

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

        // Check if seller exists and has seller role
        const seller = await User.findOne({ _id: sellerId, role: "seller" });
        if (!seller) {
            return res.status(404).json({ message: "Không tìm thấy seller" });
        }

        // Check if user is trying to follow themselves
        if (userId === sellerId) {
            return res.status(400).json({ message: "Không thể theo dõi chính mình" });
        }

        const existingFollow = await Follower.findOne({ userId, sellerId });
        if (existingFollow) {
            return res.status(400).json({ message: "Bạn đã theo dõi seller này" });
        }

        const follower = new Follower({
            userId,
            sellerId,
        });

        await follower.save();
        res.status(201).json({ message: "Theo dõi seller thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const unfollowSeller = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { sellerId } = req.params;
        const sellerIdStr = Array.isArray(sellerId) ? sellerId[0] : sellerId;

        if (!sellerIdStr) {
            return res.status(400).json({ message: "sellerId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(sellerIdStr)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        const follower = await Follower.findOneAndDelete({ userId, sellerId: sellerIdStr });
        if (!follower) {
            return res.status(404).json({ message: "Bạn chưa theo dõi seller này" });
        }

        res.status(200).json({ message: "Bỏ theo dõi seller thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getFollowedSellers = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const followers = await Follower.find({ userId })
            .populate("sellerId", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "Lấy danh sách seller đã theo dõi thành công", followers });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSellerFollowers = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { sellerId } = req.params;
        const sellerIdStr = Array.isArray(sellerId) ? sellerId[0] : sellerId;

        if (!sellerIdStr) {
            return res.status(400).json({ message: "sellerId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(sellerIdStr)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        // Check if user is the seller or admin
        const seller = await User.findById(sellerIdStr);
        if (!seller) {
            return res.status(404).json({ message: "Không tìm thấy seller" });
        }

        if (userId !== sellerIdStr && req.user?.role !== "admin") {
            return res.status(403).json({ message: "Bạn không có quyền xem danh sách người theo dõi" });
        }

        const followers = await Follower.find({ sellerId: sellerIdStr })
            .populate("userId", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "Lấy danh sách người theo dõi thành công", followers });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const checkFollowStatus = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { sellerId } = req.params;
        const sellerIdStr = Array.isArray(sellerId) ? sellerId[0] : sellerId;

        if (!sellerIdStr) {
            return res.status(400).json({ message: "sellerId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(sellerIdStr)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        const follower = await Follower.findOne({ userId, sellerId: sellerIdStr });
        res.status(200).json({ isFollowing: !!follower });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
