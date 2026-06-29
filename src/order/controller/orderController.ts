import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../model/orderModel";
import Product from "../../product/model/productModel";
import User from "../../auth_user/model/userModel";
import { notifyOrderCreated, notifyOrderStatusUpdated } from "../../notification/service/notificationService";
import { removeCartItemsAfterOrder } from "../../cart/controller/cartController";
import { AuthedRequest } from "../../_component";
import { generateOrderCode, isDuplicateOrderCodeError } from "../orderCode.util";



export const createOrder = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { sellerId, items, shippingAddress, shippingFee: clientShippingFee, shippingMethod, notes, cartItemIds } = req.body;
        
        if (!sellerId || !items || !shippingAddress) {
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

        const itemProductIds = items.map((i: { productId: string }) => i.productId);
        const orderedProducts = await Product.find({ _id: { $in: itemProductIds } });
        if (orderedProducts.length !== itemProductIds.length) {
            return res.status(400).json({ message: "Một hoặc nhiều sản phẩm không tồn tại" });
        }
        const shopIds = [...new Set(orderedProducts.map((p) => p.sellerId.toString()))];
        if (shopIds.length !== 1) {
            return res.status(400).json({ message: "Tất cả sản phẩm trong đơn phải cùng một cửa hàng (admin)" });
        }
        if (shopIds[0] !== sellerId) {
            return res.status(400).json({ message: "sellerId không khớp với sản phẩm trong đơn" });
        }
        const shopUser = await User.findById(sellerId).select("role").lean();
        if (!shopUser || shopUser.role !== "admin") {
            return res.status(400).json({ message: "Đơn chỉ được tạo cho tài khoản admin (cửa hàng)" });
        }

        const sa = shippingAddress as Record<string, unknown>;
        const shipProvince =
            (typeof sa.province === "string" && sa.province.trim())
            || (typeof sa.city === "string" && sa.city.trim())
            || "";
        const shipWard = typeof sa.ward === "string" ? sa.ward.trim() : "";

        if (
            !sa.fullName
            || !sa.phoneNumber
            || !sa.address
            || !shipProvince
            || !shipWard
        ) {
            return res.status(400).json({
                message: "shippingAddress cần fullName, phoneNumber, address, ward và province (hoặc city)",
            });
        }

        const normalizedShipping: Record<string, string> = {
            fullName: String(sa.fullName).trim(),
            phoneNumber: String(sa.phoneNumber).trim(),
            address: String(sa.address).trim(),
            province: shipProvince,
            ward: shipWard,
        };
        if (typeof sa.district === "string" && sa.district.trim()) {
            normalizedShipping.district = sa.district.trim();
        }
        if (typeof sa.city === "string" && sa.city.trim()) {
            normalizedShipping.city = sa.city.trim();
        }

        // Xác định phương thức vận chuyển
        const isPickup = shippingMethod === "pickup";

        // Phí ship: pickup = 0đ, GHTK = từ client (đã gọi GET /shipping/fee)
        const shippingFee = isPickup
            ? 0
            : (typeof clientShippingFee === "number" && clientShippingFee >= 0 ? clientShippingFee : 0);

        // Tiền hàng + phí ship = tổng thanh toán
        const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const totalPrice = itemsTotal + shippingFee;

        let savedOrder: InstanceType<typeof Order> | null = null;
        let orderCode = "";

        for (let attempt = 0; attempt < 5; attempt++) {
            orderCode = await generateOrderCode();
            try {
                const newOrder = new Order({
                    userId,
                    sellerId,
                    orderCode,
                    items,
                    shippingMethod: shippingMethod || "ghtk",
                    shippingFee,
                    totalPrice,
                    shippingAddress: normalizedShipping,
                    notes,
                    status: "pending",
                });
                savedOrder = await newOrder.save();
                break;
            } catch (saveError) {
                if (isDuplicateOrderCodeError(saveError) && attempt < 4) continue;
                throw saveError;
            }
        }

        if (!savedOrder) {
            return res.status(500).json({ message: "Không thể tạo mã đơn hàng, vui lòng thử lại" });
        }

        if (Array.isArray(cartItemIds) && cartItemIds.length > 0) {
            try {
                await removeCartItemsAfterOrder(userId, cartItemIds, items);
            } catch (cartError) {
                console.error("Error removing cart items after order:", cartError);
            }
        }

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

/** Admin: đơn bán của hệ thống; có thể lọc ?sellerId= */
export const getOrdersForSeller = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        let filter: Record<string, unknown>;
        const q = req.query.sellerId;
        const sellerIdParam = typeof q === "string" ? q.trim() : "";
        if (sellerIdParam) {
            if (!mongoose.Types.ObjectId.isValid(sellerIdParam)) {
                return res.status(400).json({ message: "sellerId không hợp lệ" });
            }
            filter = { sellerId: sellerIdParam };
        } else {
            filter = {};
        }

        const orders = await Order.find(filter)
            .populate("userId", "name email phoneNumber")
            .populate("sellerId", "name email")
            .populate("items.productId")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "Lấy danh sách đơn bán thành công", orders });
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

/** Admin: chi tiết đơn bán */
export const getOrderForSeller = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const rawId = req.params.id;
        const id = typeof rawId === "string" ? rawId : rawId?.[0];
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Id đơn hàng không hợp lệ" });
        }

        const order = await Order.findById(id)
            .populate("userId", "name email phoneNumber")
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
        const validStatuses = ["pending", "shipping", "delivered", "cancelled"];
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

        try {
            await notifyOrderStatusUpdated(
                updatedOrder.userId.toString(), 
                updatedOrder._id.toString(), 
                updatedOrder.orderCode, 
                status
            );
        } catch (notificationError) {
            console.error("Error sending status update notification:", notificationError);
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