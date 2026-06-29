import { Response } from "express";
import mongoose from "mongoose";
import SearchLog from "../model/searchLogModel";
import Product from "../model/productModel";
import { AuthedRequest } from "../../_component";

const SEARCH_UPSERT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * POST /product/search/log
 * Ghi hành vi tìm kiếm của user vào MongoDB (collection search_logs).
 * PythonAI sẽ đọc collection này để tính trọng số hành vi (weight = 2).
 *
 * Body: { keyword: string, resultProductIds?: string[] }
 */
export const recordSearchLog = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Chưa xác thực" });
        }

        const { keyword, resultProductIds } = req.body as {
            keyword?: string;
            resultProductIds?: string[];
        };

        if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
            return res.status(400).json({ success: false, message: "keyword không hợp lệ" });
        }

        const trimmedKeyword = keyword.trim().toLowerCase();
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const since = new Date(Date.now() - SEARCH_UPSERT_WINDOW_MS);

        // Validate và chuyển resultProductIds sang ObjectId
        const validProductIds = (resultProductIds || [])
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        // Upsert: cùng user + cùng keyword trong 24h thì chỉ cập nhật thời gian
        await SearchLog.updateOne(
            {
                userId: userObjectId,
                keyword: trimmedKeyword,
                searchedAt: { $gte: since },
            },
            {
                $set: {
                    searchedAt: new Date(),
                    resultProductIds: validProductIds,
                },
                $setOnInsert: {
                    userId: userObjectId,
                    keyword: trimmedKeyword,
                },
            },
            { upsert: true }
        );

        return res.status(200).json({ success: true, message: "Search log recorded" });
    } catch (error: any) {
        console.error("recordSearchLog:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
