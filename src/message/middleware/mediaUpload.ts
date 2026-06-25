import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../../_component/utils/cloudinary";

const IMAGE_MIME_PREFIX = "image/";
const VIDEO_MIME_PREFIX = "video/";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith(IMAGE_MIME_PREFIX) || file.mimetype.startsWith(VIDEO_MIME_PREFIX)) {
        cb(null, true);
        return;
    }
    cb(new Error("Chỉ chấp nhận file ảnh hoặc video"));
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_VIDEO_SIZE,
        files: 1,
    },
});

export const uploadMessageMedia = upload.single("file");

export const uploadMessageMediaToCloudinary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = (req as Request & { file?: Express.Multer.File }).file;
        if (!file) {
            return next();
        }

        const isVideo = file.mimetype.startsWith(VIDEO_MIME_PREFIX);
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

        if (file.size > maxSize) {
            return res.status(400).json({
                message: isVideo
                    ? "Video tối đa 50MB"
                    : "Ảnh tối đa 10MB",
            });
        }

        const result = await uploadToCloudinary(file.buffer, "message_media", {
            resource_type: isVideo ? "video" : "image",
        });

        if (isVideo) {
            req.body.videoUrl = result.secure_url;
            req.body.messageType = "video";
        } else {
            req.body.imageUrl = result.secure_url;
            req.body.messageType = "image";
        }

        req.body.mediaPublicId = result.public_id;
        next();
    } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("Error uploading message media:", error);
        res.status(500).json({ message: "Lỗi khi tải media lên", error: err.message ?? "Upload failed" });
    }
};
