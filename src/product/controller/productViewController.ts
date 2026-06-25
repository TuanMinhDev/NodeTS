import { Response } from "express";
import mongoose from "mongoose";
import Product from "../model/productModel";
import ProductView from "../model/productViewModel";
import { AuthedRequest } from "../../_component";

const VIEW_SOURCES = ["detail_page", "search", "recommend"] as const;
const VIEW_UPSERT_WINDOW_MS = 24 * 60 * 60 * 1000;

const normalizeSource = (raw: unknown): string => {
    if (typeof raw === "string" && VIEW_SOURCES.includes(raw as (typeof VIEW_SOURCES)[number])) {
        return raw;
    }
    return "detail_page";
};

export const recordProductView = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Chưa xác thực" });
        }

        const productIdParam = req.params.productId;
        const productIdStr = Array.isArray(productIdParam) ? productIdParam[0] : productIdParam;

        if (!productIdStr || !mongoose.Types.ObjectId.isValid(productIdStr)) {
            return res.status(400).json({ success: false, message: "productId không hợp lệ" });
        }

        const product = await Product.findOne({
            _id: productIdStr,
            isActive: { $ne: false },
        });
        if (!product) {
            return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const productObjectId = new mongoose.Types.ObjectId(productIdStr);
        const since = new Date(Date.now() - VIEW_UPSERT_WINDOW_MS);
        const source = normalizeSource(req.body?.source);

        await ProductView.updateOne(
            {
                userId: userObjectId,
                productId: productObjectId,
                viewedAt: { $gte: since },
            },
            {
                $set: {
                    viewedAt: new Date(),
                    source,
                },
                $setOnInsert: {
                    userId: userObjectId,
                    productId: productObjectId,
                },
            },
            { upsert: true }
        );

        return res.status(200).json({ success: true, message: "View recorded" });
    } catch (error: any) {
        console.error("recordProductView:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getRecentViews = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Chưa xác thực" });
        }

        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const views = await ProductView.aggregate([
            { $match: { userId: userObjectId } },
            { $sort: { viewedAt: -1 } },
            {
                $group: {
                    _id: "$productId",
                    viewedAt: { $first: "$viewedAt" },
                    source: { $first: "$source" },
                },
            },
            { $sort: { viewedAt: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product",
                },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    "product.isActive": { $ne: false },
                },
            },
            {
                $project: {
                    productId: "$_id",
                    viewedAt: 1,
                    source: 1,
                    product: {
                        _id: "$product._id",
                        name: "$product.name",
                        images: "$product.images",
                        sale: "$product.sale",
                        variants: "$product.variants",
                        categoryId: "$product.categoryId",
                        sellerId: "$product.sellerId",
                    },
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            message: "Lấy lịch sử xem gần đây thành công",
            items: views,
            totalItems: views.length,
        });
    } catch (error: any) {
        console.error("getRecentViews:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
