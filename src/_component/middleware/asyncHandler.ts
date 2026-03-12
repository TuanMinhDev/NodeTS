import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/response";

/**
 * Async error handler wrapper
 * @param fn - Async function to wrap
 * @returns Wrapped function with error handling
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch((error: any) => {
            console.error("Async error:", error);
            
            // Handle validation errors
            if (error.name === "ValidationError") {
                const messages = Object.values(error.errors).map((err: any) => err.message);
                return errorResponse(res, messages.join(", "), 400);
            }

            // Handle duplicate key errors
            if (error.code === 11000) {
                const field = Object.keys(error.keyValue)[0];
                return errorResponse(res, `${field} đã tồn tại`, 409);
            }

            // Handle Cast errors (invalid ObjectId)
            if (error.name === "CastError") {
                return errorResponse(res, "ID không hợp lệ", 400);
            }

            // Handle JWT errors
            if (error.name === "JsonWebTokenError") {
                return errorResponse(res, "Token không hợp lệ", 401);
            }

            if (error.name === "TokenExpiredError") {
                return errorResponse(res, "Token đã hết hạn", 401);
            }

            // Handle Multer errors
            if (error.code === "LIMIT_FILE_SIZE") {
                return errorResponse(res, "File quá lớn", 400);
            }

            if (error.code === "LIMIT_FILE_COUNT") {
                return errorResponse(res, "Quá nhiều file", 400);
            }

            if (error.code === "LIMIT_UNEXPECTED_FILE") {
                return errorResponse(res, "File không được phép", 400);
            }

            // Handle custom thrown errors
            if (error.message) {
                return errorResponse(res, error.message, 400);
            }

            // Default error
            return errorResponse(res, "Lỗi server", 500, error);
        });
    };
};

/**
 * Try-catch wrapper for synchronous functions
 * @param fn - Function to wrap
 * @returns Wrapped function with error handling
 */
export const tryCatch = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            fn(req, res, next);
        } catch (error: any) {
            console.error("Sync error:", error);
            
            if (error.message) {
                return errorResponse(res, error.message, 400);
            }
            
            return errorResponse(res, "Lỗi server", 500, error);
        }
    };
};
