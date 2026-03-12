import { Response } from "express";

/**
 * Standard success response
 * @param res - Express response object
 * @param data - Response data
 * @param message - Success message
 * @param statusCode - HTTP status code (default: 200)
 */
export const successResponse = (
    res: Response,
    data?: any,
    message: string = "Thành công",
    statusCode: number = 200
) => {
    const response: any = {
        success: true,
        message,
        statusCode
    };

    if (data !== undefined) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

/**
 * Standard error response
 * @param res - Express response object
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param error - Error details
 */
export const errorResponse = (
    res: Response,
    message: string = "Lỗi server",
    statusCode: number = 500,
    error?: any
) => {
    const response: any = {
        success: false,
        message,
        statusCode
    };

    if (error !== undefined) {
        response.error = error;
    }

    return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param res - Express response object
 * @param data - Response data array
 * @param pagination - Pagination info
 * @param message - Success message
 */
export const paginatedResponse = (
    res: Response,
    data: any[],
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    },
    message: string = "Lấy dữ liệu thành công"
) => {
    return successResponse(res, {
        items: data,
        pagination
    }, message);
};

/**
 * Created response (201)
 * @param res - Express response object
 * @param data - Created data
 * @param message - Success message
 */
export const createdResponse = (
    res: Response,
    data: any,
    message: string = "Tạo thành công"
) => {
    return successResponse(res, data, message, 201);
};

/**
 * Not found response (404)
 * @param res - Express response object
 * @param message - Error message
 */
export const notFoundResponse = (
    res: Response,
    message: string = "Không tìm thấy"
) => {
    return errorResponse(res, message, 404);
};

/**
 * Bad request response (400)
 * @param res - Express response object
 * @param message - Error message
 */
export const badRequestResponse = (
    res: Response,
    message: string = "Yêu cầu không hợp lệ"
) => {
    return errorResponse(res, message, 400);
};

/**
 * Unauthorized response (401)
 * @param res - Express response object
 * @param message - Error message
 */
export const unauthorizedResponse = (
    res: Response,
    message: string = "Chưa xác thực"
) => {
    return errorResponse(res, message, 401);
};

/**
 * Forbidden response (403)
 * @param res - Express response object
 * @param message - Error message
 */
export const forbiddenResponse = (
    res: Response,
    message: string = "Không có quyền truy cập"
) => {
    return errorResponse(res, message, 403);
};

/**
 * Conflict response (409)
 * @param res - Express response object
 * @param message - Error message
 */
export const conflictResponse = (
    res: Response,
    message: string = "Dữ liệu đã tồn tại"
) => {
    return errorResponse(res, message, 409);
};
