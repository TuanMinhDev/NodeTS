import mongoose from "mongoose";

/**
 * Validate MongoDB ObjectId
 * @param id - ID string to validate
 * @param fieldName - Field name for error message
 * @returns Validated ID string
 */
export const validateObjectId = (id: string, fieldName: string = "ID"): string => {
    if (!id) {
        throw new Error(`${fieldName} là bắt buộc`);
    }

    const idStr = Array.isArray(id) ? id[0] : id;
    
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
        throw new Error(`${fieldName} không hợp lệ`);
    }

    return idStr;
};

/**
 * Validate pagination parameters
 * @param page - Page number
 * @param limit - Limit per page
 * @returns Pagination object
 */
export const validatePagination = (page?: any, limit?: any) => {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    if (pageNum < 1) {
        throw new Error("Page phải lớn hơn 0");
    }

    if (limitNum < 1 || limitNum > 100) {
        throw new Error("Limit phải nằm trong khoảng 1-100");
    }

    const skip = (pageNum - 1) * limitNum;

    return {
        page: pageNum,
        limit: limitNum,
        skip
    };
};

/**
 * Validate required fields
 * @param data - Object to validate
 * @param requiredFields - Array of required field names
 */
export const validateRequiredFields = (data: any, requiredFields: string[]) => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            missingFields.push(field);
        }
    }

    if (missingFields.length > 0) {
        throw new Error(`Thiếu các trường bắt buộc: ${missingFields.join(', ')}`);
    }
};

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns Valid email string
 */
export const validateEmail = (email: string): string => {
    if (!email) {
        throw new Error("Email là bắt buộc");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error("Email không hợp lệ");
    }

    return email.trim().toLowerCase();
};

/**
 * Validate phone number (Vietnamese format)
 * @param phone - Phone number to validate
 * @returns Valid phone number
 */
export const validatePhone = (phone: string): string => {
    if (!phone) {
        throw new Error("Số điện thoại là bắt buộc");
    }

    const phoneRegex = /^(0|\+84)[3-9][0-9]{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
        throw new Error("Số điện thoại không hợp lệ");
    }

    return cleanPhone;
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Valid password
 */
export const validatePassword = (password: string): string => {
    if (!password) {
        throw new Error("Mật khẩu là bắt buộc");
    }

    if (password.length < 6) {
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    if (password.length > 50) {
        throw new Error("Mật khẩu không được quá 50 ký tự");
    }

    return password;
};

/**
 * Validate file size
 * @param fileSize - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @param fieldName - Field name for error message
 */
export const validateFileSize = (fileSize: number, maxSize: number, fieldName: string = "File"): void => {
    if (fileSize > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        throw new Error(`${fieldName} quá lớn. Tối đa ${maxSizeMB}MB`);
    }
};

/**
 * Validate image file type
 * @param mimeType - MIME type to validate
 * @returns True if valid image type
 */
export const validateImageType = (mimeType: string): boolean => {
    const validTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
    ];

    return validTypes.includes(mimeType);
};

/**
 * Sanitize string input
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: string): string => {
    if (typeof input !== 'string') {
        return '';
    }

    return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate number range
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @param fieldName - Field name for error message
 * @returns Valid number
 */
export const validateNumberRange = (
    value: number, 
    min: number, 
    max: number, 
    fieldName: string = "Giá trị"
): number => {
    if (isNaN(value)) {
        throw new Error(`${fieldName} phải là số`);
    }

    if (value < min || value > max) {
        throw new Error(`${fieldName} phải nằm trong khoảng ${min}-${max}`);
    }

    return value;
};
