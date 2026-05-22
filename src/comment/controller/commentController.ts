import { Request, Response } from "express";
import Comment from "../model/commentModel";
import Order from "../../order/model/orderModel";
import { AuthedRequest } from "../../_component";

function normalizeProductId(productId: unknown): string {
    const raw = Array.isArray(productId) ? productId[0] : productId;
    return String(raw ?? "").trim();
}

/** ObjectId hoặc populated ref { _id } → chuỗi id ổn định */
function refIdString(ref: unknown): string {
    if (ref == null) return "";
    if (typeof ref === "object" && "_id" in (ref as object)) {
        return String((ref as { _id: unknown })._id);
    }
    return String(ref);
}

export const createComment = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { productId, orderId, orderItemId, content, rating, img } = req.body;

        // Validate required fields
        if (!productId || !orderId || !content || !rating) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        const productIdStr = normalizeProductId(productId);
        if (!productIdStr) {
            return res.status(400).json({ message: "productId không hợp lệ" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating phải từ 1 đến 5" });
        }

        // Load order and validate ownership
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        // Check if order belongs to user
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Đơn hàng không thuộc về bạn" });
        }

        // Check if order is delivered
        if (order.status !== "delivered") {
            return res.status(400).json({ message: "Chỉ đánh giá sau khi đơn đã giao" });
        }

        // Find matching item in order
        const orderItem = order.items.find(item => {
            const productIdMatch = refIdString(item.productId) === productIdStr;
            const orderItemIdMatch = !orderItemId || item._id.toString() === orderItemId;
            return productIdMatch && orderItemIdMatch;
        });

        if (!orderItem) {
            return res.status(400).json({ message: "Sản phẩm không có trong đơn hàng" });
        }

        // Luôn lưu orderItemId từ dòng đơn thật (tránh FE sai + unique index theo dòng hoạt động đúng)
        const commentData: Record<string, unknown> = {
            userId,
            orderId,
            orderItemId: orderItem._id,
            productId: productIdStr,
            content,
            rating,
            img: img != null && img !== "" ? String(img).trim() : "",
        };

        const doc = await Comment.findOneAndUpdate(
            { productId: productIdStr },
            {
                $push: {
                    comment: commentData,
                },
                $setOnInsert: { productId: productIdStr },
            },
            { upsert: true, new: true }
        );

        await doc.populate("comment.userId", "name email");
        const item = doc.comment[doc.comment.length - 1];

        res.status(201).json({ message: "Tạo bình luận thành công", comment: item });
    } catch (error: unknown) {
        const err = error as { code?: number; message?: string };
        if (err.code === 11000) {
            return res.status(409).json({
                message: "Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi.",
            });
        }
        res.status(500).json({ message: err.message ?? "Lỗi máy chủ" });
    }
};

export const getReviewableItems = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chua xác thuc" });

        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ message: "Thieu orderId" });
        }

        // Load order and validate ownership
        const order = await Order.findById(orderId).populate("items.productId");
        if (!order) {
            return res.status(404).json({ message: "Không tìmtha don hàng" });
        }

        // Check if order belongs to user
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Don hàng không thuoc ve ban" });
        }

        // Check if order is delivered
        if (order.status !== "delivered") {
            return res.status(400).json({ message: "Chi xem các món có the danh gia sau khi don da giao" });
        }

        // Mỗi sản phẩm một document Comment — phải lấy hết doc có comment thuộc đơn này
        const commentDocs = await Comment.find({
            comment: { $elemMatch: { orderId, userId } },
        }).lean();

        const commentedOrderItemIds = new Set<string>();
        const reviewedKeys = new Set<string>(); // userId|orderId|productId khi không có orderItemId (legacy)
        for (const doc of commentDocs) {
            for (const c of doc.comment ?? []) {
                if (c.orderId?.toString() !== orderId || c.userId?.toString() !== userId.toString()) {
                    continue;
                }
                if (c.orderItemId) {
                    commentedOrderItemIds.add(c.orderItemId.toString());
                } else {
                    reviewedKeys.add(`${c.userId}-${orderId}-${refIdString(c.productId)}`);
                }
            }
        }

        // Filter items that haven't been reviewed yet
        const reviewableItems = order.items
            .filter(item => {
                if (commentedOrderItemIds.has(item._id.toString())) return false;
                const legacyKey = `${userId}-${orderId}-${refIdString(item.productId)}`;
                if (reviewedKeys.has(legacyKey)) return false;
                return true;
            })
            .map(item => ({
                orderItemId: item._id,
                productId: item.productId,
                variant: item.variant,
                quantity: item.quantity,
                price: item.price
            }));

        res.status(200).json({
            message: "Lay danh sách món có the danh gia thành công",
            orderId,
            reviewableItems
        });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi máy chủ" });
    }
};

export const getCommentsByProduct = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const productIdStr = normalizeProductId(productId);
        if (!productIdStr) {
            return res.status(400).json({ message: "productId không xác lêp" });
        }

        const doc = await Comment.findOne({ productId: productIdStr }).populate(
            "comment.userId",
            "name email"
        );

        const comment = doc
            ? [...doc.comment].sort(
                  (a, b) =>
                      new Date(b.createdAt as Date).getTime() -
                      new Date(a.createdAt as Date).getTime()
              ).map(item => ({
                  _id: item._id,
                  userId: item.userId,
                  rating: item.rating,
                  content: item.content,
                  img: item.img,
                  createdAt: item.createdAt,
                  updatedAt: item.updatedAt,
                  // Include order context for potential UI use
                  orderId: item.orderId,
                  orderItemId: item.orderItemId
              }))
            : [];

        res.status(200).json({
            message: "Lây danh sách bình luân thành công",
            productId: productIdStr,
            comment,
        });
    } catch (error: unknown) {
        const err = error as { message?: string };
        res.status(500).json({ message: err.message ?? "Lỗi máy chủ" });
    }
};
