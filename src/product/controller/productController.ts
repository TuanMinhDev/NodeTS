import { Request, Response } from "express";
import Product from "../model/productModel";
import { v2 as cloudinary } from "cloudinary";

type MulterFileLike = { path: string };

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createProduct = async (req: Request, res: Response) => {
    const authReq = req as any; // Cast để lấy user từ middleware
    try {
        const { name, description, attributes } = req.body;
        const sellerId = authReq.user?.userId;

        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized: Missing seller information" });
        }

        if (!cloudinary) {
            return res.status(500).json({ message: "Cloudinary is not configured" });
        }

        const parsedAttributes = typeof attributes === "string" ? JSON.parse(attributes) : attributes;

        // Ép kiểu req.files để tránh lỗi TS
        const files = ((req as any).files as MulterFileLike[]) ?? [];
        const file = ((req as any).file as MulterFileLike | undefined);
        const effectiveFiles = file ? [file, ...files] : files;
        
        if (effectiveFiles.length > 0) {
            // Upload song song các ảnh để tối ưu hiệu năng
            const uploadPromises = effectiveFiles.map((file, index) => {
                if (parsedAttributes[index]) {
                    return cloudinary.uploader.upload(file.path, { folder: "products" })
                        .then((result: any) => {
                            parsedAttributes[index].image = result.secure_url;
                        });
                }
                return Promise.resolve();
            });

            await Promise.all(uploadPromises);
        }

        // Kiểm tra xem tất cả các attribute đã có image chưa (vì Model yêu cầu image: required)
        const missingImage = parsedAttributes.some((attr: any) => !attr.image);
        if (missingImage) {
            return res.status(400).json({ message: "All product attributes must have an image" });
        }

        const newProduct = new Product({
            name,
            description,
            sellerId,
            attributes: parsedAttributes
        });

        await newProduct.save();
        res.status(201).json({ message: "Product created successfully", product: newProduct });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const { name, minPrice, maxPrice, sellerId } = req.query;

        const filter: any = {};

        if (name) {
            filter.name = { $regex: name, $options: "i" }; // Tìm kiếm theo tên không phân biệt hoa thường
        }

        if (sellerId) {
            filter.sellerId = sellerId;
        }

        // Filter theo giá (nằm trong mảng attributes)
        if (minPrice || maxPrice) {
            filter["attributes.price"] = {};
            if (minPrice) filter["attributes.price"].$gte = Number(minPrice);
            if (maxPrice) filter["attributes.price"].$lte = Number(maxPrice);
        }

        const products = await Product.find(filter).populate("sellerId", "name email");
        
        res.status(200).json({
            count: products.length,
            products
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const updateProduct = async (req: Request, res: Response) => {
    const authReq = req as any;
    try {
        const { id } = req.params;
        const { name, description, attributes } = req.body;
        const userId = authReq.user?.userId;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Kiểm tra quyền sở hữu
        if (product.sellerId.toString() !== userId && authReq.user?.role !== "admin") {
            return res.status(403).json({ message: "You do not have permission to update this product" });
        }

        let updatedAttributes = attributes;
        if (typeof attributes === "string") {
            updatedAttributes = JSON.parse(attributes);
        }

        // Xử lý upload ảnh mới nếu có (tương tự create)
        const files = ((req as any).files as MulterFileLike[]) ?? [];
        const file = ((req as any).file as MulterFileLike | undefined);
        const effectiveFiles = file ? [file, ...files] : files;

        if (effectiveFiles.length > 0 && updatedAttributes) {
            const uploadPromises = effectiveFiles.map((file, index) => {
                if (updatedAttributes[index]) {
                    return cloudinary.uploader.upload(file.path, { folder: "products" })
                        .then((result: any) => {
                            updatedAttributes[index].image = result.secure_url;
                        });
                }
                return Promise.resolve();
            });
            await Promise.all(uploadPromises);
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                name: name || product.name,
                description: description || product.description,
                attributes: updatedAttributes || product.attributes,
            },
            { new: true }
        );

        res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const authReq = req as any;
    try {
        const { id } = req.params;
        const userId = authReq.user?.userId;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Kiểm tra quyền sở hữu
        if (product.sellerId.toString() !== userId && authReq.user?.role !== "admin") {
            return res.status(403).json({ message: "You do not have permission to delete this product" });
        }

        await Product.findByIdAndDelete(id);

        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};