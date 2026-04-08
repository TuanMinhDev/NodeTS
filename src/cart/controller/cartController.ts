import { Request, Response } from "express";
import mongoose from "mongoose";
import Cart from "../model/cartModel";
import Product from "../../product/model/productModel";
import { AuthedRequest } from "../../_component";

export const addToCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { items } = req.body as {
      items?: {
        productId: string;
        variant: { color: string; size: string };
        quantity: number;
      }[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items phải là mảng và không được rỗng" });
    }

    // Find existing cart for user
    let cart = await Cart.findOne({ userId, status: "active" });

    // If no cart exists, create new one
    if (!cart) {
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

        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ message: `Không tìm thấy sản phẩm: ${item.productId}` });
        }

        const variant = product.variants.find(
          v => v.color === item.variant.color && v.size === item.variant.size
        );
        if (!variant) {
          return res.status(404).json({ message: `Không tìm thấy variant ${item.variant.color} - ${item.variant.size} cho sản phẩm ${item.productId}` });
        }

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

      const totalPrice = processedItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
      
      cart = await Cart.create({
        userId,
        items: processedItems,
        totalPrice,
        status: "active",
      });

      return res.status(201).json({ message: "Tạo giỏ hàng thành công", cart });
    }

    // Add items to existing cart
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

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Không tìm thấy sản phẩm: ${item.productId}` });
      }

      const variant = product.variants.find(
        v => v.color === item.variant.color && v.size === item.variant.size
      );
      if (!variant) {
        return res.status(404).json({ message: `Không tìm thấy variant ${item.variant.color} - ${item.variant.size} cho sản phẩm ${item.productId}` });
      }

      let finalPrice = variant.price || 0;
      if (product.sale && product.sale > 0 && variant.price) {
        finalPrice = variant.price * (1 - product.sale / 100);
      }

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (cartItem: any) => 
          cartItem.productId.toString() === item.productId &&
          cartItem.variant.color === item.variant.color &&
          cartItem.variant.size === item.variant.size
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        cart.items[existingItemIndex].quantity += item.quantity;
      } else {
        // Add new item
        cart.items.push({
          productId: item.productId,
          variant: item.variant,
          quantity: item.quantity,
          price: finalPrice
        });
      }
    }

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    await cart.save();

    return res.status(200).json({ message: "Thêm sản phẩm vào giỏ hàng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};

export const getCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { pageNumber = 1, pageSize = 10 } = req.query;
    const page = Number(pageNumber);
    const limit = Number(pageSize);
    const skip = (page - 1) * limit;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    const paginatedItems = cart.items.slice(skip, skip + limit);
    const totalItems = cart.items.length;
    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: page
    });
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
    console.log("itemIds:", itemIds);

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const beforeLen = cart.items.length;
    cart.items = cart.items.filter((item: any) => !itemIds.includes(item._id.toString())) as any;

    if (cart.items.length === beforeLen) {
      return res.status(404).json({ message: "Các items không có trong giỏ hàng" });
    }

    cart.totalPrice = cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    await cart.save();
    return res.status(200).json({ message: "Xóa sản phẩm khỏi giỏ hàng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};

export const updateQuantityProductCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const itemId = req.params.id as string;
    if (!itemId) return res.status(400).json({ message: "Thiếu itemId" });
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "itemId không hợp lệ" });
    }

    const { quantity } = req.body as { quantity?: number };
    if (typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({ message: "quantity phải là số > 0" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });

    const item = cart.items.find((i: any) => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });

    (item as any).quantity = quantity;

    cart.totalPrice = cart.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
    await cart.save();

    return res.status(200).json({ message: "Cập nhật số lượng thành công", data: cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};
