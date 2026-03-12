import { Request, Response, NextFunction } from "express";
import { validatePagination } from "../utils/validation";
import { badRequestResponse } from "../utils/response";

/**
 * Pagination middleware
 * @param defaultLimit - Default limit per page (default: 10)
 * @param maxLimit - Maximum limit per page (default: 100)
 * @returns Middleware function
 */
export const pagination = (defaultLimit: number = 10, maxLimit: number = 100) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page, limit } = req.query;
            
            const pagination = validatePagination(page, limit);
            
            // Override limit if it exceeds maxLimit
            if (pagination.limit > maxLimit) {
                pagination.limit = maxLimit;
                pagination.skip = (pagination.page - 1) * maxLimit;
            }
            
            // Add pagination to request
            (req as any).pagination = pagination;
            
            next();
        } catch (error: any) {
            return badRequestResponse(res, error.message);
        }
    };
};

/**
 * Get pagination info for response
 * @param total - Total number of documents
 * @param pagination - Pagination object
 * @returns Pagination info object
 */
export const getPaginationInfo = (total: number, pagination: { page: number; limit: number }) => {
    return {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
        hasNext: pagination.page < Math.ceil(total / pagination.limit),
        hasPrev: pagination.page > 1
    };
};
