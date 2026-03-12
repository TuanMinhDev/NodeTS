import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Upload file to Cloudinary
 * @param fileBuffer - File buffer
 * @param folder - Cloudinary folder name
 * @param options - Additional upload options
 * @returns Upload result
 */
export const uploadToCloudinary = async (
    fileBuffer: Buffer,
    folder: string,
    options: any = {}
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder,
            resource_type: "auto",
            quality: "auto",
            fetch_format: "auto",
            ...options
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error || !result) {
                    return reject(error || new Error("Upload failed"));
                }
                resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Upload image to Cloudinary with image-specific options
 * @param fileBuffer - Image buffer
 * @param folder - Folder name
 * @param options - Additional options
 * @returns Upload result
 */
export const uploadImageToCloudinary = async (
    fileBuffer: Buffer,
    folder: string,
    options: any = {}
): Promise<any> => {
    const imageOptions = {
        folder,
        resource_type: "image",
        quality: "auto",
        fetch_format: "auto",
        ...options
    };

    return uploadToCloudinary(fileBuffer, folder, imageOptions);
};

/**
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public ID
 * @param resourceType - Resource type (default: 'image')
 * @returns Delete result
 */
export const deleteFromCloudinary = async (
    publicId: string,
    resourceType: string = "image"
): Promise<any> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(
            publicId,
            { resource_type: resourceType },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            }
        );
    });
};

/**
 * Get Cloudinary URL from public ID
 * @param publicId - Cloudinary public ID
 * @param options - URL options
 * @returns Cloudinary URL
 */
export const getCloudinaryUrl = (publicId: string, options: any = {}): string => {
    return cloudinary.url(publicId, options);
};

/**
 * Validate Cloudinary configuration
 * @returns True if properly configured
 */
export const validateCloudinaryConfig = (): boolean => {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

/**
 * Common folder names for different resource types
 */
export const CLOUDINARY_FOLDERS = {
    PRODUCTS: "products",
    MESSAGE_IMAGES: "message_images",
    USER_AVATARS: "user_avatars",
    CATEGORY_IMAGES: "category_images",
    COMMENT_IMAGES: "comment_images"
} as const;

/**
 * Default upload options for different resource types
 */
export const DEFAULT_UPLOAD_OPTIONS = {
    PRODUCT: {
        folder: CLOUDINARY_FOLDERS.PRODUCTS,
        transformation: [
            { quality: "auto", fetch_format: "auto" },
            { crop: "limit", width: 800, height: 600 }
        ]
    },
    MESSAGE_IMAGE: {
        folder: CLOUDINARY_FOLDERS.MESSAGE_IMAGES,
        transformation: [
            { quality: "auto", fetch_format: "auto" },
            { crop: "limit", width: 500, height: 500 }
        ]
    },
    USER_AVATAR: {
        folder: CLOUDINARY_FOLDERS.USER_AVATARS,
        transformation: [
            { quality: "auto", fetch_format: "auto" },
            { crop: "fill", width: 200, height: 200, gravity: "face" }
        ]
    },
    CATEGORY_IMAGE: {
        folder: CLOUDINARY_FOLDERS.CATEGORY_IMAGES,
        transformation: [
            { quality: "auto", fetch_format: "auto" },
            { crop: "fill", width: 300, height: 200 }
        ]
    }
} as const;

/**
 * Upload product image
 * @param fileBuffer - Image buffer
 * @returns Upload result
 */
export const uploadProductImage = (fileBuffer: Buffer) => {
    return uploadImageToCloudinary(fileBuffer, CLOUDINARY_FOLDERS.PRODUCTS, DEFAULT_UPLOAD_OPTIONS.PRODUCT);
};

/**
 * Upload message image
 * @param fileBuffer - Image buffer
 * @returns Upload result
 */
export const uploadMessageImage = (fileBuffer: Buffer) => {
    return uploadImageToCloudinary(fileBuffer, CLOUDINARY_FOLDERS.MESSAGE_IMAGES, DEFAULT_UPLOAD_OPTIONS.MESSAGE_IMAGE);
};

/**
 * Upload user avatar
 * @param fileBuffer - Image buffer
 * @returns Upload result
 */
export const uploadUserAvatar = (fileBuffer: Buffer) => {
    return uploadImageToCloudinary(fileBuffer, CLOUDINARY_FOLDERS.USER_AVATARS, DEFAULT_UPLOAD_OPTIONS.USER_AVATAR);
};

/**
 * Upload category image
 * @param fileBuffer - Image buffer
 * @returns Upload result
 */
export const uploadCategoryImage = (fileBuffer: Buffer) => {
    return uploadImageToCloudinary(fileBuffer, CLOUDINARY_FOLDERS.CATEGORY_IMAGES, DEFAULT_UPLOAD_OPTIONS.CATEGORY_IMAGE);
};
