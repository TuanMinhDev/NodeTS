import multer from "multer";

/**
 * Dùng memoryStorage để tránh phụ thuộc vào việc ghi file xuống ổ cứng.
 * Controller sẽ lấy `file.buffer` để upload lên Cloudinary.
 */
const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
};

export const uploadProductImages = multer({
    storage,
    fileFilter,
    limits: {
        // 10MB / ảnh
        fileSize: 10 * 1024 * 1024,
        // giới hạn số field để tránh abuse
        fields: 50,
        files: 10,
    },
});
