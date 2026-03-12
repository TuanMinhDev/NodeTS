import { Request, Response } from "express";
import mongoose from "mongoose";
import Comment from "../model/commentModel";
import Product from "../../product/model/productModel";
import { AuthedRequest } from "../../_component";

export const createComment = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { productId, content, rating, images } = req.body;

        if (!productId || !content || !rating) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        const productIdStr = Array.isArray(productId) ? productId[0] : productId;
        if (!mongoose.Types.ObjectId.isValid(productIdStr)) {
            return res.status(400).json({ message: "productId không hợp lệ" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating phải từ 1 đến 5" });
        }

        const comment = new Comment({
            productId: productIdStr,
            userId,
            content,
            rating,
            images: images || [],
        });

        const savedComment = await comment.save();
        await savedComment.populate("userId", "name email");
        
        res.status(201).json({ message: "Tạo bình luận thành công", comment: savedComment });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCommentsByProduct = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const productIdStr = Array.isArray(productId) ? productId[0] : productId;

        if (!mongoose.Types.ObjectId.isValid(productIdStr)) {
            return res.status(400).json({ message: "productId không hợp lệ" });
        }

        const comments = await Comment.find({ productId: productIdStr })
            .populate("userId", "name email")
            .populate("replies.userId", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "Lấy danh sách bình luận thành công", comments });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateComment = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const { content, rating, images } = req.body;

        const comment = await Comment.findOne({ _id: id, userId });
        if (!comment) {
            return res.status(404).json({ message: "Không tìm thấy bình luận hoặc bạn không có quyền sửa" });
        }

        if (content) comment.content = content;
        if (rating) comment.rating = rating;
        if (images) comment.images = images;

        const updatedComment = await comment.save();
        await updatedComment.populate("userId", "name email");

        res.status(200).json({ message: "Cập nhật bình luận thành công", comment: updatedComment });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteComment = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const comment = await Comment.findOne({ _id: id, userId });

        if (!comment) {
            return res.status(404).json({ message: "Không tìm thấy bình luận hoặc bạn không có quyền xóa" });
        }

        await Comment.findByIdAndDelete(id);
        res.status(200).json({ message: "Xóa bình luận thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const likeComment = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const comment = await Comment.findById(id);

        if (!comment) {
            return res.status(404).json({ message: "Không tìm thấy bình luận" });
        }

        const isLiked = comment.likes.includes(userId);
        if (isLiked) {
            comment.likes = comment.likes.filter((id: string) => id !== userId);
        } else {
            comment.likes.push(userId);
        }

        await comment.save();
        res.status(200).json({ message: isLiked ? "Bỏ thích thành công" : "Thích thành công", likes: comment.likes.length });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const replyToComment = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Nội dung trả lời là bắt buộc" });
        }

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ message: "Không tìm thấy bình luận" });
        }

        comment.replies.push({
            userId,
            content,
            createdAt: new Date(),
        });

        await comment.save();
        await comment.populate("replies.userId", "name email");

        res.status(201).json({ message: "Trả lời bình luận thành công", comment });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
