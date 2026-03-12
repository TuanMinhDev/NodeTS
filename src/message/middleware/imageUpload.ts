import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Chỉ chấp nhận file ảnh"));
    }
};

// Configure multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only 1 image per message
    },
});

// Upload to Cloudinary function
export const uploadMessageImage = upload.single("image");

// Upload image to Cloudinary middleware
export const uploadMessageImageToCloudinary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = (req as any).file;
        if (!file) {
            return next(); // No file, continue to next middleware
        }

        // Upload to Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: "message_images",
                    resource_type: "image",
                    quality: "auto",
                    fetch_format: "auto"
                },
                (error, result) => {
                    if (error || !result) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(file.buffer);
        });

        // Add Cloudinary URL to request body
        req.body.imageUrl = result.secure_url;
        req.body.imagePublicId = result.public_id;
        
        next();
    } catch (error: any) {
        console.error("Error uploading message image:", error);
        res.status(500).json({ message: "Lỗi khi tải ảnh lên", error: error.message });
    }
};
