import { Request, Response } from "express";
import mongoose from "mongoose";
import Cart from "../model/cartModel";
import Product from "../../product/model/productModel";

type AuthedRequest = Request & { user?: { userId?: string; id?: string; role?: string } };

export const createCart = async (req: AuthedRequest, res: Response) => {
  try {
    console.log("=== CREATE CART DEBUG START ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request user:", JSON.stringify(req.user, null, 2));
    
    const userId = req.user?.userId || req.user?.id;
    console.log("Extracted userId:", userId);
    
    if (!userId) {
      console.log("ERROR: No userId found");
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    const { items, status } = req.body as {
      items?: {
        productId: string;
        variant: { color: string; size: string };
        quantity: number;
      }[];
      status?: "active" | "inactive";
    };

    // Handle both single item and array of items
    let processedItemsData: {
      productId: string;
      variant: { color: string; size: string };
      quantity: number;
    }[] = [];

    // Check if request has single item (FE format) or array of items
    if (req.body.productId && req.body.variant && req.body.quantity) {
      // Single item format from FE
      processedItemsData = [{
        productId: req.body.productId,
        variant: req.body.variant,
        quantity: req.body.quantity
      }];
    } else if (Array.isArray(items) && items.length > 0) {
      // Array format
      processedItemsData = items;
    } else {
      console.log("ERROR: Neither single item nor valid items array found");
      return res.status(400).json({ 
        message: "Cần có productId, variant, quantity (cho 1 item) hoặc items array (cho nhiều items)" 
      });
    }

    console.log("Processed items data:", JSON.stringify(processedItemsData, null, 2));
    console.log("Status:", status);

    // Validate items structure and fetch product data
    const processedItems = [];
    console.log("Starting to process", processedItemsData.length, "items");
    
    for (const item of processedItemsData) {
      console.log("Processing item:", JSON.stringify(item, null, 2));
      
      if (!item.productId || !item.variant || !item.variant.color || !item.variant.size) {
        console.log("ERROR: Invalid item structure:", JSON.stringify(item, null, 2));
        return res.status(400).json({ message: "Mỗi item phải có productId, variant.color, variant.size" });
      }
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        console.log("ERROR: Invalid productId:", item.productId);
        return res.status(400).json({ message: `productId không hợp lệ: ${item.productId}` });
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        console.log("ERROR: Invalid quantity:", item.quantity);
        return res.status(400).json({ message: "quantity phải là số > 0" });
      }

      console.log("Fetching product:", item.productId);
      // Fetch product to get price and sale information
      const product = await Product.findById(item.productId);
      console.log("Found product:", product ? "YES" : "NO");
      
      if (!product) {
        console.log("ERROR: Product not found:", item.productId);
        return res.status(404).json({ message: `Không tìm thấy sản phẩm: ${item.productId}` });
      }

      console.log("Product variants:", JSON.stringify(product.variants, null, 2));
      
      // Find the specific variant to get its price
      const variant = product.variants.find(
        v => v.color === item.variant.color && v.size === item.variant.size
      );
      console.log("Found variant:", variant ? "YES" : "NO");
      
      if (!variant) {
        console.log("ERROR: Variant not found:", item.variant.color, "-", item.variant.size);
        return res.status(404).json({ message: `Không tìm thấy variant ${item.variant.color} - ${item.variant.size} cho sản phẩm ${item.productId}` });
      }

      // Calculate final price based on sale
      let finalPrice = variant.price || 0;
      console.log("Original price:", variant.price, "Sale:", product.sale);
      
      if (product.sale && product.sale > 0 && variant.price) {
        finalPrice = variant.price * (1 - product.sale / 100);
        console.log("Final price after sale:", finalPrice);
      }

      const processedItem = {
        productId: item.productId,
        variant: item.variant,
        quantity: item.quantity,
        price: finalPrice
      };
      console.log("Processed item:", JSON.stringify(processedItem, null, 2));
      
      processedItems.push(processedItem);
    }

    // Calculate total price
    const totalPrice = processedItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
    console.log("Calculated total price:", totalPrice);

    console.log("Creating cart with data:", {
      userId,
      items: processedItems,
      totalPrice,
      status: status ?? "active",
    });

    // Find existing cart for the user or create a new one
    let cart = await Cart.findOne({ userId, status: status ?? "active" });
    
    if (cart) {
      // Add new items to existing cart
      console.log("Found existing cart, adding items to it");
      
      for (const newItem of processedItems) {
        // Check if the same product with same variant already exists in cart
        const existingItemIndex = cart.items.findIndex(
          (item: any) => 
            item.productId.toString() === newItem.productId && 
            item.variant.color === newItem.variant.color && 
            item.variant.size === newItem.variant.size
        );
        
        if (existingItemIndex >= 0) {
          // Update quantity if item already exists
          cart.items[existingItemIndex].quantity += newItem.quantity;
          console.log(`Updated existing item quantity: ${cart.items[existingItemIndex].quantity}`);
        } else {
          // Add new item to cart
          cart.items.push(newItem);
          console.log("Added new item to cart");
        }
      }
      
      // Recalculate total price
      cart.totalPrice = cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      console.log("Updated total price:", cart.totalPrice);
      
      await cart.save();
      console.log("Cart updated successfully");
    } else {
      // Create new cart if none exists
      console.log("No existing cart found, creating new one");
      cart = await Cart.create({
        userId,
        items: processedItems,
        totalPrice,
        status: status ?? "active",
      });
      console.log("New cart created successfully");
    }

    console.log("Cart created successfully:", JSON.stringify(cart, null, 2));
    console.log("=== CREATE CART DEBUG END ===");

    const message = cart.items.length === processedItems.length ? 
      "Tạo giỏ hàng thành công" : 
      "Thêm sản phẩm vào giỏ hàng thành công";
    
    return res.status(201).json({ message, cart });
  } catch (error: any) {
    console.log("=== CREATE CART ERROR ===");
    console.log("Error details:", error);
    console.log("Error message:", error?.message);
    console.log("Error stack:", error?.stack);
    console.log("=== CREATE CART ERROR END ===");
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

export const updateQuantityProductCart = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const cartId = req.params.id as string;
    const itemId = req.params.itemId as string;
    
    if (!cartId) return res.status(400).json({ message: "Thiếu cartId" });
    if (!itemId) return res.status(400).json({ message: "Thiếu itemId" });
    
    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({ message: "cartId không hợp lệ" });
    }
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "itemId không hợp lệ" });
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

    // Find the specific item in the cart
    const itemIndex = cart.items.findIndex((item: any) => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    // Update quantity of the specific item
    cart.items[itemIndex].quantity = quantity;

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    await cart.save();

    return res.status(200).json({ message: "Cập nhật số lượng thành công", cart });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Lỗi server" });
  }
};
