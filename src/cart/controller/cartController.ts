import { Request, Response } from "express";
import mongoose from "mongoose";
import Cart from "../model/cartModel";

type AuthedRequest = Request & { user?: { userId?: string; id?: string; role?: string } };

export const createCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { products, quantity, totalPrice, status } = req.body as {
      products?: string[];
      quantity?: number;
      totalPrice?: number;
      status?: "active" | "inactive";
    };

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "products phải là mảng và không được rỗng" });
    }

    const invalidProductId = products.find((p) => !mongoose.Types.ObjectId.isValid(p));
    if (invalidProductId) {
      return res.status(400).json({ message: `productId không hợp lệ: ${invalidProductId}` });
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải là số > 0" });
    }

    if (typeof totalPrice !== "number" || totalPrice < 0) {
      return res.status(400).json({ message: "Tổng tiền phải là số >= 0" });
    }

    const cart = await Cart.create({
      userId,
      products,
      quantity,
      totalPrice,
      status: status ?? "active",
    });

    return res.status(201).json({ message: "Tạo giỏ hàng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};

export const getCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const cart = await Cart.findOne({ userId }).populate("products");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    return res.status(200).json({ message: "Lấy giỏ hàng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};

// Xóa nhiều sản phẩm khỏi giỏ hàng của chính user
// body: { productIds: string[] }
export const deleteProductCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { productIds } = req.body as { productIds?: string[] };
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "productIds phải là mảng và không được rỗng" });
    }

    const invalidProductId = productIds.find((p) => !mongoose.Types.ObjectId.isValid(p));
    if (invalidProductId) {
      return res.status(400).json({ message: `productId không hợp lệ: ${invalidProductId}` });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const beforeLen = cart.products.length;
    cart.products = cart.products.filter((p: any) => !productIds.includes(p.toString()));

    if (cart.products.length === beforeLen) {
      return res.status(404).json({ message: "Các sản phẩm không có trong giỏ hàng" });
    }

    await cart.save();
    return res.status(200).json({ message: "Xóa sản phẩm khỏi giỏ hàng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};

// Update số lượng (quantity) của cart của chính user
// params: :id = cartId
// body: { quantity: number }
export const updateQuantityProductCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const cartId = req.params.id as string;
    if (!cartId) return res.status(400).json({ message: "Thiếu cartId" });
    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({ message: "cartId không hợp lệ" });
    }

    const { quantity } = req.body as { quantity?: number };
    if (typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({ message: "quantity phải là số > 0" });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    // Ownership check
    if (cart.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    cart.quantity = quantity;
    await cart.save();

    return res.status(200).json({ message: "Cập nhật số lượng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};
