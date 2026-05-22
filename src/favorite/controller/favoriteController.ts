import { Response } from "express";
import mongoose from "mongoose";
import Favorite from "../model/favoriteModel";
import Product from "../../product/model/productModel";
import { AuthedRequest } from "../../_component";

export const addToFavorites = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { productId } = req.body;
        const productIdStr = Array.isArray(productId) ? productId[0] : productId;

        if (!productIdStr) {
            return res.status(400).json({ message: "productId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(productIdStr)) {
            return res.status(400).json({ message: "productId không hợp lệ" });
        }

        const product = await Product.findById(productIdStr);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        const pid = new mongoose.Types.ObjectId(productIdStr);
        const existing = await Favorite.findOne({ userId, products: pid });
        if (existing) {
            return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích" });
        }

        await Favorite.findOneAndUpdate(
            { userId },
            { $addToSet: { products: pid }, $setOnInsert: { userId } },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: "Thêm vào danh sách yêu thích thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const removeFromFavorites = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { productId } = req.params;
        const productIdStr = Array.isArray(productId) ? productId[0] : productId;

        if (!productIdStr) {
            return res.status(400).json({ message: "productId là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(productIdStr)) {
            return res.status(400).json({ message: "productId không hợp lệ" });
        }

        const pid = new mongoose.Types.ObjectId(productIdStr);
        const result = await Favorite.updateOne({ userId }, { $pull: { products: pid } });

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Không tìm thấy danh sách yêu thích" });
        }
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm trong danh sách yêu thích" });
        }

        res.status(200).json({ message: "Xóa khỏi danh sách yêu thích thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getFavorites = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const doc = await Favorite.findOne({ userId }).populate("products").lean();

        const favorites = doc?.products ?? [];

        res.status(200).json({ message: "Lấy danh sách yêu thích thành công", favorites });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
