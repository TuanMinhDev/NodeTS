import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../model/orderModel";
import User from "../../auth_user/model/userModel";

export const createOrder = async (req: Request, res: Response) => {
    try {
        const { products, user, description } = req.body;
        const userId = (req as any).user?.userId;
        
        if (!userId || !products || !user) {
             res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
             return;
        }

        if (!Array.isArray(products) || products.length === 0) {
            res.status(400).json({ message: "products phải là mảng và không được rỗng" });
            return;
        }

        // Validate products structure
        for (const product of products) {
            if (!product.productId || !product.color || !product.size) {
                res.status(400).json({ message: "Mỗi product phải có productId, color, size" });
                return;
            }
            if (!mongoose.Types.ObjectId.isValid(product.productId)) {
                res.status(400).json({ message: `productId không hợp lệ: ${product.productId}` });
                return;
            }
            if (typeof product.quantity !== "number" || product.quantity <= 0) {
                res.status(400).json({ message: "quantity phải là số > 0" });
                return;
            }
        }

        // Validate user info
        if (!user.name || !user.phone || !user.address) {
            res.status(400).json({ message: "User phải có name, phone, address" });
            return;
        }

        const newOrder = new Order({
            userId,
            products,
            user,
            description: description || "",
            totalPrice: 0,
        });

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        
        if (!userId) {
            res.status(401).json({ message: "Không tìm thấy thông tin người dùng" });
            return;
        }

        const orders = await Order.find({ userId })
            .populate("userId", "username email")
            .populate("products.productId")
            .sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatusOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Status field has been removed from model
        res.status(400).json({ message: "Tính năng cập nhật trạng thái đã bị vô hiệu hóa" });
        return;
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedOrder = await Order.findByIdAndDelete(id);

        if (!deletedOrder) {
             res.status(404).json({ message: "Không tìm thấy đơn hàng để xóa" });
             return;
        }

        res.status(200).json({ message: "Xóa đơn hàng thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};