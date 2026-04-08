import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../model/orderModel";
import Product from "../../product/model/productModel";
import Address from "../../address/model/addressModel";
import { notifyOrderCreated, notifyOrderStatusUpdated } from "../../notification/service/notificationService";
import { AuthedRequest } from "../../_component";

// ─── Shipping fee config ────────────────────────────────────────────────────

const RATE_PER_KM      = 4000;   // Hỏa tốc: 4,000đ/km
const FEE_ECONOMY      = 20000;  // Tiết kiệm: cố định
const FEE_FAST         = 35000;  // Nhanh: cố định

// Ước tính khoảng cách (km) dựa trên district/ward vì chưa có tọa độ GPS
const estimateDistanceKm = (
    sellerDistrict: string, sellerWard: string,
    buyerDistrict:  string, buyerWard:  string,
): number => {
    const sameDistrict = sellerDistrict.trim().toLowerCase() === buyerDistrict.trim().toLowerCase();
    const sameWard     = sameDistrict && sellerWard.trim().toLowerCase() === buyerWard.trim().toLowerCase();

    if (sameWard)     return 2;   // Cùng phường/xã
    if (sameDistrict) return 8;   // Cùng quận/huyện, khác phường
    return 20;                    // Cùng tỉnh, khác quận/huyện
};

type ShippingOptionRow = {
    method: string;
    label: string;
    fee: number;
    estimatedDays: string;
    distanceKm?: number;
    note?: string;
};

/** allowExpress: false khi đơn gom nhiều cửa hàng — không áp dụng hỏa tốc. */
const buildSellerShippingOptions = (
    seller: { province: string; district: string; ward: string },
    buyer: { province: string; district: string; ward: string },
    allowExpress: boolean,
): { options: ShippingOptionRow[]; isSameProvince: boolean } => {
    const isSameProvince =
        seller.province.trim().toLowerCase() === buyer.province.trim().toLowerCase();

    const distanceKm = isSameProvince
        ? estimateDistanceKm(seller.district, seller.ward, buyer.district, buyer.ward)
        : null;
    const expressFee = distanceKm !== null ? distanceKm * RATE_PER_KM : null;

    const options: ShippingOptionRow[] = [
        {
            method:        "economy",
            label:         "Vận chuyển tiết kiệm",
            fee:           FEE_ECONOMY,
            estimatedDays: isSameProvince ? "3-5 ngày" : "5-7 ngày",
        },
        {
            method:        "fast",
            label:         "Vận chuyển nhanh",
            fee:           FEE_FAST,
            estimatedDays: isSameProvince ? "1-2 ngày" : "2-3 ngày",
        },
    ];

    if (allowExpress && isSameProvince && expressFee !== null && distanceKm !== null) {
        options.push({
            method:        "express",
            label:         "Vận chuyển hỏa tốc",
            fee:           expressFee,
            estimatedDays: "Trong ngày",
            distanceKm,
            note:          `Ước tính ${distanceKm}km × 4,000đ`,
        });
    }

    return { options, isSameProvince };
};

const queryString = (q: unknown): string | undefined => {
    if (typeof q === "string") return q;
    if (Array.isArray(q) && q.length > 0 && typeof q[0] === "string") return q[0];
    return undefined;
};

// ─── Get shipping options ────────────────────────────────────────────────────

export const getShippingOptions = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const addressId = queryString(req.query.addressId);
        const productIdsRaw = queryString(req.query.productIds);
        const productIdLegacy = queryString(req.query.productId);

        let productIds: string[];
        const useLegacySingleResponse = productIdsRaw === undefined;

        if (productIdsRaw !== undefined) {
            productIds = [
                ...new Set(
                    productIdsRaw
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                ),
            ];
        } else if (productIdLegacy) {
            productIds = [productIdLegacy.trim()];
        } else {
            return res.status(400).json({ message: "Thiếu productId hoặc productIds và addressId" });
        }

        if (!addressId || productIds.length === 0) {
            return res.status(400).json({ message: "Thiếu productId(s) hoặc addressId" });
        }
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ message: "addressId không hợp lệ" });
        }
        for (const id of productIds) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: `productId không hợp lệ: ${id}` });
            }
        }

        const buyerAddressDoc = await Address.findOne({ userId });
        const buyerAddress = buyerAddressDoc?.addresses.find((a: any) => a._id.toString() === addressId);
        if (!buyerAddress) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ giao hàng" });
        }
        const buyer = buyerAddress as { province: string; district: string; ward: string };

        const products = await Product.find({ _id: { $in: productIds } });
        if (products.length !== productIds.length) {
            return res.status(404).json({ message: "Một hoặc nhiều sản phẩm không tồn tại" });
        }
        const inactive = products.find((p) => !p.isActive);
        if (inactive) {
            return res.status(400).json({ message: "Có sản phẩm không còn hoạt động" });
        }

        const bySeller = new Map<string, string[]>();
        for (const p of products) {
            const sid = p.sellerId.toString();
            if (!bySeller.has(sid)) bySeller.set(sid, []);
            bySeller.get(sid)!.push(p._id.toString());
        }

        const multiSeller = bySeller.size > 1;

        if (useLegacySingleResponse && productIds.length === 1) {
            const sellerId = [...bySeller.keys()][0];
            const sellerAddressDoc = await Address.findOne({ userId: sellerId });
            const sellerWarehouse = sellerAddressDoc?.addresses.find((a: any) => a.type === "warehouse");
            if (!sellerWarehouse) {
                return res.status(400).json({ message: "Seller chưa cấu hình địa chỉ kho hàng" });
            }
            const seller = sellerWarehouse as { province: string; district: string; ward: string };
            const { options, isSameProvince } = buildSellerShippingOptions(seller, buyer, true);

            return res.status(200).json({
                sellerId,
                sellerProvince: seller.province,
                buyerProvince:  buyer.province,
                isSameProvince,
                options,
            });
        }

        const sellers: Array<{
            sellerId: string;
            productIds: string[];
            sellerProvince: unknown;
            buyerProvince: unknown;
            isSameProvince: boolean;
            options: ShippingOptionRow[];
        }> = [];

        let combinedEconomy = 0;
        let combinedFast = 0;
        let combinedExpress: number | null = null;

        for (const [sellerId, pids] of bySeller) {
            const sellerAddressDoc = await Address.findOne({ userId: sellerId });
            const sellerWarehouse = sellerAddressDoc?.addresses.find((a: any) => a.type === "warehouse");
            if (!sellerWarehouse) {
                return res.status(400).json({
                    message: `Seller chưa cấu hình địa chỉ kho hàng (sellerId: ${sellerId})`,
                });
            }
            const seller = sellerWarehouse as { province: string; district: string; ward: string };
            const allowExpress = !multiSeller;
            const { options, isSameProvince } = buildSellerShippingOptions(seller, buyer, allowExpress);

            combinedEconomy += FEE_ECONOMY;
            combinedFast += FEE_FAST;
            if (!multiSeller) {
                const ex = options.find((o) => o.method === "express");
                combinedExpress = ex ? ex.fee : null;
            }

            sellers.push({
                sellerId,
                productIds: pids,
                sellerProvince: seller.province,
                buyerProvince: buyer.province,
                isSameProvince,
                options,
            });
        }

        const expressAvailable = !multiSeller && combinedExpress !== null;

        const combinedOptions: ShippingOptionRow[] = [
            {
                method:        "economy",
                label:         "Vận chuyển tiết kiệm (tổng các kiện)",
                fee:           combinedEconomy,
                estimatedDays: multiSeller ? "5-10 ngày (theo từng cửa hàng)" : "3-7 ngày",
            },
            {
                method:        "fast",
                label:         "Vận chuyển nhanh (tổng các kiện)",
                fee:           combinedFast,
                estimatedDays: multiSeller ? "3-5 ngày (theo từng cửa hàng)" : "1-3 ngày",
            },
            ...(expressAvailable && combinedExpress !== null
                ? [{
                    method:        "express",
                    label:         "Vận chuyển hỏa tốc",
                    fee:           combinedExpress,
                    estimatedDays: "Trong ngày",
                    note:          "Chỉ khi toàn bộ sản phẩm cùng một cửa hàng và cùng tỉnh với kho",
                } as ShippingOptionRow]
                : []),
        ];

        return res.status(200).json({
            multiSeller,
            expressAvailable,
            ...(multiSeller
                ? {
                    expressUnavailableReason:
                        "Đơn có nhiều cửa hàng: không áp dụng hỏa tốc; phí tiết kiệm / nhanh là tổng từng kho đến bạn.",
                }
                : {}),
            sellers,
            combined: {
                economy: combinedEconomy,
                fast:    combinedFast,
                express: combinedExpress,
            },
            combinedOptions,
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const createOrder = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { sellerId, items, shippingAddress, shippingMethod, notes } = req.body;
        
        if (!sellerId || !items || !shippingAddress || !shippingMethod) {
             return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        const validShippingMethods = ["economy", "fast", "express"];
        if (!validShippingMethods.includes(shippingMethod)) {
            return res.status(400).json({ message: "shippingMethod không hợp lệ (economy | fast | express)" });
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

        // Tính phí ship phía server — không nhận từ client
        let shippingFee = 0;
        if (shippingMethod === "economy") {
            shippingFee = FEE_ECONOMY;
        } else if (shippingMethod === "fast") {
            shippingFee = FEE_FAST;
        } else if (shippingMethod === "express") {
            // Hỏa tốc: cần lấy địa chỉ kho seller và địa chỉ buyer để tính km
            const sellerAddressDoc = await Address.findOne({ userId: sellerId });
            const sellerWarehouse  = sellerAddressDoc?.addresses.find((a: any) => a.type === "warehouse");

            if (!sellerWarehouse) {
                return res.status(400).json({ message: "Seller chưa cấu hình địa chỉ kho hàng" });
            }

            const seller = sellerWarehouse as any;
            const isSameProvince = seller.province.trim().toLowerCase()
                === shippingAddress.city?.trim().toLowerCase();

            if (!isSameProvince) {
                return res.status(400).json({ message: "Vận chuyển hỏa tốc chỉ áp dụng trong cùng tỉnh/thành phố" });
            }

            const distanceKm = estimateDistanceKm(
                seller.district,          seller.ward,
                shippingAddress.district, shippingAddress.ward,
            );
            shippingFee = distanceKm * RATE_PER_KM;
        }

        // Tiền hàng + phí ship = tổng thanh toán
        const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalPrice = itemsTotal + shippingFee;

        // Generate unique order code
        const orderCode = `ORD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const newOrder = new Order({
            userId,
            sellerId,
            orderCode,
            items,
            shippingMethod,
            shippingFee,
            totalPrice,
            shippingAddress,

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