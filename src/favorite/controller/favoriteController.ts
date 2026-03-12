import { Request, Response } from "express";
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

        const existingFavorite = await Favorite.findOne({ userId, productId: productIdStr });
        if (existingFavorite) {
            return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích" });
        }

        const favorite = new Favorite({
            userId,
            productId: productIdStr,
        });

        await favorite.save();
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

        const favorite = await Favorite.findOneAndDelete({ userId, productId: productIdStr });
        if (!favorite) {
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

        const favorites = await Favorite.find({ userId })
            .populate("productId")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "Lấy danh sách yêu thích thành công", favorites });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const checkFavorite = async (req: AuthedRequest, res: Response) => {
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

        const favorite = await Favorite.findOne({ userId, productId: productIdStr });
        res.status(200).json({ isFavorite: !!favorite });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
