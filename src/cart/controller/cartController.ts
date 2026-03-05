import { Request, Response } from "express";
import mongoose from "mongoose";
import Cart from "../model/cartModel";
import Product from "../../product/model/productModel";

type AuthedRequest = Request & { user?: { userId?: string; id?: string; role?: string } };

export const createCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { items, status } = req.body as {
      items?: {
        productId: string;
        variant: { color: string; size: string };
        quantity: number;
      }[];
      status?: "active" | "inactive";
    };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items phải là mảng và không được rỗng" });
    }

    // Validate items structure and fetch product data
    const processedItems = [];
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

      // Fetch product to get price and sale information
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Không tìm thấy sản phẩm: ${item.productId}` });
      }

      // Find the specific variant to get its price
      const variant = product.variants.find(
        v => v.color === item.variant.color && v.size === item.variant.size
      );
      if (!variant) {
        return res.status(404).json({ message: `Không tìm thấy variant ${item.variant.color} - ${item.variant.size} cho sản phẩm ${item.productId}` });
      }

      // Calculate final price based on sale
      let finalPrice = variant.price || 0;
      if (product.sale && product.sale > 0 && variant.price) {
        finalPrice = variant.price * (1 - product.sale / 100);
      }

      processedItems.push({
        productId: item.productId,
        variant: item.variant,
        quantity: item.quantity,
        price: finalPrice
      });
    }

    // Calculate total price
    const totalPrice = processedItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

    const cart = await Cart.create({
      userId,
      items: processedItems,
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

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    return res.status(200).json({ message: "Lấy giỏ hàng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};


export const deleteProductCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { itemIds } = req.body as { itemIds?: string[] };
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "itemIds phải là mảng và không được rỗng" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const beforeLen = cart.items.length;
    cart.items = cart.items.filter((item: any) => !itemIds.includes(item._id.toString())) as any;

    if (cart.items.length === beforeLen) {
      return res.status(404).json({ message: "Các items không có trong giỏ hàng" });
    }

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
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

    // Recalculate total price based on new quantity
    cart.totalPrice = cart.items.reduce((sum: number, item: any) => sum + (item.price * quantity), 0);
    await cart.save();

    return res.status(200).json({ message: "Cập nhật số lượng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};
