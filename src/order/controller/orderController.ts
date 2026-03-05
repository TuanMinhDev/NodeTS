import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../model/orderModel";

export const createOrder = async (req: Request, res: Response) => {
    try {
        const { userId, sellerId, items } = req.body;
        
        if (!userId || !sellerId || !items) {
             res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
             return;
        }

        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ message: "items phải là mảng và không được rỗng" });
            return;
        }

        // Validate items structure
        for (const item of items) {
            if (!item.productId || !item.variant || !item.variant.color || !item.variant.size) {
                res.status(400).json({ message: "Mỗi item phải có productId, variant.color, variant.size" });
                return;
            }
            if (!mongoose.Types.ObjectId.isValid(item.productId)) {
                res.status(400).json({ message: `productId không hợp lệ: ${item.productId}` });
                return;
            }
            if (typeof item.quantity !== "number" || item.quantity <= 0) {
                res.status(400).json({ message: "quantity phải là số > 0" });
                return;
            }
            if (typeof item.price !== "number" || item.price <= 0) {
                res.status(400).json({ message: "price phải là số > 0" });
                return;
            }
        }

        // Calculate total price
        const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const newOrder = new Order({
            userId,
            sellerId,
            items,
            totalPrice,
            status: 1, // Mặc định là chờ xác nhận
        });

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate("userId", "username email")
            .populate("sellerId", "username email")
            .populate("items.productId");

        if (!order) {
             res.status(404).json({ message: "Không tìm thấy đơn hàng" });
             return;
        }

        res.status(200).json(order);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatusOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Kiểm tra status có hợp lệ trong enum [0,1,2,3,4,5] không
        if (![0, 1, 2, 3, 4, 5].includes(status)) {
             res.status(400).json({ message: "Trạng thái không hợp lệ" });
             return;
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
             res.status(404).json({ message: "Không tìm thấy đơn hàng" });
             return;
        }

        res.status(200).json(updatedOrder);
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