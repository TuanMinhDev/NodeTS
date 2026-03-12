import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../model/orderModel";
import { notifyOrderCreated, notifyOrderStatusUpdated } from "../../notification/service/notificationService";
import { AuthedRequest } from "../../_component";

export const createOrder = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { sellerId, items, shippingAddress, paymentMethod, notes } = req.body;
        
        if (!sellerId || !items || !shippingAddress || !paymentMethod) {
             return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "items phải là mảng và không được rỗng" });
        }

        // Validate items structure
        for (const item of items) {
            if (!item.productId || !item.variant || !item.variant.color || !item.variant.size) {
                return res.status(400).json({ message: "Mỗi item phải có productId, variant.color, variant.size" });
            }
            if (!mongoose.Types.ObjectId.isValid(item.productId)) {
                return res.status(400).json({ message: `productId không hợp lệ: ${item.productId}` });
            }
            if (typeof item.quantity !== "number" || item.quantity <= 0) {
                return res.status(400).json({ message: "quantity phải là số > 0" });
            }
            if (typeof item.price !== "number" || item.price <= 0) {
                return res.status(400).json({ message: "price phải là số > 0" });
            }
        }

        // Calculate total price
        const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Generate unique order code
        const orderCode = `ORD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const newOrder = new Order({
            userId,
            sellerId,
            orderCode,
            items,
            totalPrice,
            shippingAddress,
            paymentMethod,
            notes,
            status: "pending",
        });

        const savedOrder = await newOrder.save();

        // Send notifications to seller and buyer
        try {
            await notifyOrderCreated(sellerId, userId, savedOrder._id.toString(), orderCode);
        } catch (notificationError) {
            console.error("Error sending notifications:", notificationError);
            // Don't fail the order creation if notification fails
        }

        res.status(201).json(savedOrder);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrders = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const orders = await Order.find({ userId })
            .populate("sellerId", "name email")
            .populate("items.productId")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "Lấy danh sách đơn hàng thành công", orders });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrder = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const order = await Order.findOne({ _id: id, userId })
            .populate("sellerId", "name email")
            .populate("items.productId");

        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        res.status(200).json({ message: "Lấy đơn hàng thành công", order });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatusOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Kiểm tra status có hợp lệ không
        const validStatuses = ["pending", "confirmed", "preparing", "shipping", "delivered", "cancelled", "returned"];
        if (!validStatuses.includes(status)) {
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

        // Send notification to buyer about status update
        try {
            await notifyOrderStatusUpdated(
                updatedOrder.userId.toString(), 
                updatedOrder._id.toString(), 
                updatedOrder.orderCode, 
                status
            );
        } catch (notificationError) {
            console.error("Error sending status update notification:", notificationError);
            // Don't fail the status update if notification fails
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