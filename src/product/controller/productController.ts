import { Request, Response } from "express";
import Product from "../model/productModel";
import { v2 as cloudinary } from "cloudinary";

type MulterFileLike = { buffer: Buffer; mimetype: string };

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (file: MulterFileLike): Promise<string> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
                if (error || !result) return reject(error);
                resolve(result.secure_url);
            }
        );
        uploadStream.end(file.buffer);
    });
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, description, category, sale, variants } = req.body;

        // Parse variants if it's a string (from form-data)
        let parsedVariants = variants;
        if (typeof variants === 'string') {
            try {
                parsedVariants = JSON.parse(variants);
            } catch (error) {
                return res.status(400).json({ message: "variants phải là JSON hợp lệ" });
            }
        }

        if (!name || !description || !category || !parsedVariants) {
            return res.status(400).json({ message: "Thiếu thông tin sản phẩm bắt buộc (name, description, category, variants)" });
        }

        console.log("Received variants:", parsedVariants);
        console.log("Type of variants:", typeof parsedVariants);
        console.log("Is array?:", Array.isArray(parsedVariants));

        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({ message: "variants phải là mảng và không được rỗng" });
        }

        // Validate variants structure
        for (const variant of parsedVariants) {
            if (!variant.color || !variant.size || variant.stock === undefined || variant.sold === undefined || variant.price === undefined) {
                return res.status(400).json({ message: "Mỗi variant phải có color, size, stock, sold, price" });
            }
            if (typeof variant.stock !== 'number' || variant.stock < 0) {
                return res.status(400).json({ message: "stock phải là số >= 0" });
            }
            if (typeof variant.sold !== 'number' || variant.sold < 0) {
                return res.status(400).json({ message: "sold phải là số >= 0" });
            }
            if (typeof variant.price !== 'number' || variant.price <= 0) {
                return res.status(400).json({ message: "price phải là số > 0" });
            }
        }

        // Upload tất cả ảnh song song
        const files = ((req as any).files as MulterFileLike[]) ?? [];
        const imageUrls: string[] = await Promise.all(files.map(uploadToCloudinary));

        const newProduct = new Product({
            name,
            description,
            category,
            sale: sale !== undefined ? Number(sale) : null,
            variants: parsedVariants.map((v: any) => ({
                color: v.color,
                size: v.size,
                stock: Number(v.stock),
                sold: Number(v.sold),
                price: Number(v.price)
            })),
            images: imageUrls,
        });

        await newProduct.save();
        return res.status(201).json({ message: "Tạo sản phẩm thành công", product: newProduct });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};


export const getProduct = async (req: Request, res: Response) => {
    try {
        const { name, category, minPrice, maxPrice, onSale, color, size, pageNumber, pageSize } = req.query;

        const filter: any = {};

        if (name) {
            filter.name = { $regex: name, $options: "i" };
        }

        if (category) {
            filter.category = { $regex: category, $options: "i" };
        }

        // Filter by variants price range
        if (minPrice || maxPrice) {
            const priceFilter: any = {};
            if (minPrice) priceFilter.$gte = Number(minPrice);
            if (maxPrice) priceFilter.$lte = Number(maxPrice);
            filter["variants.price"] = priceFilter;
        }

        // Filter by variants color
        if (color) {
            filter["variants.color"] = { $regex: color, $options: "i" };
        }

        // Filter by variants size
        if (size) {
            filter["variants.size"] = { $regex: size, $options: "i" };
        }

        // Lọc sản phẩm đang sale
        if (onSale === "true") {
            filter.sale = { $ne: null };
        }

        // Phân trang
        const page = Number(pageNumber) || 1;
        const limit = Number(pageSize) || 10;
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(filter);

        return res.status(200).json({
            count: products.length,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
            products,
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, category, sale, variants } = req.body;

        // Parse variants if it's a string (from form-data)
        let parsedVariants = variants;
        if (typeof variants === 'string') {
            try {
                parsedVariants = JSON.parse(variants);
            } catch (error) {
                return res.status(400).json({ message: "variants phải là JSON hợp lệ" });
            }
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Validate variants if provided
        if (parsedVariants !== undefined) {
            if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
                return res.status(400).json({ message: "variants phải là mảng và không được rỗng" });
            }

            for (const variant of parsedVariants) {
                if (!variant.color || !variant.size || variant.stock === undefined || variant.sold === undefined || variant.price === undefined) {
                    return res.status(400).json({ message: "Mỗi variant phải có color, size, stock, sold, price" });
                }
                if (typeof variant.stock !== 'number' || variant.stock < 0) {
                    return res.status(400).json({ message: "stock phải là số >= 0" });
                }
                if (typeof variant.sold !== 'number' || variant.sold < 0) {
                    return res.status(400).json({ message: "sold phải là số >= 0" });
                }
                if (typeof variant.price !== 'number' || variant.price <= 0) {
                    return res.status(400).json({ message: "price phải là số > 0" });
                }
            }
        }

        // Upload ảnh mới nếu có rồi ghép với ảnh cũ
        const files = ((req as any).files as MulterFileLike[]) ?? [];
        let updatedImages = product.images ?? [];
        if (files.length > 0) {
            const newUrls = await Promise.all(files.map(uploadToCloudinary));
            updatedImages = [...updatedImages, ...newUrls];
        }

        // Hỗ trợ xoá ảnh cụ thể: truyền removeImages = ["url1", "url2"]
        const { removeImages } = req.body;
        if (removeImages) {
            const toRemove: string[] = typeof removeImages === "string" ? JSON.parse(removeImages) : removeImages;
            updatedImages = updatedImages.filter((img: string) => !toRemove.includes(img));
        }

        const updateData: any = {
            name: name ?? product.name,
            description: description ?? product.description,
            category: category ?? product.category,
            sale: sale !== undefined ? (sale === "null" || sale === null ? null : Number(sale)) : product.sale,
            images: updatedImages,
        };

        if (parsedVariants !== undefined) {
            updateData.variants = parsedVariants.map((v: any) => ({
                color: v.color,
                size: v.size,
                stock: Number(v.stock),
                sold: Number(v.sold),
                price: Number(v.price)
            }));
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        return res.status(200).json({ message: "Cập nhật sản phẩm thành công", product: updatedProduct });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        return res.status(200).json({ product });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        return res.status(200).json({ message: "Xóa sản phẩm thành công" });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};
