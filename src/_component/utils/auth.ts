import { Request, Response } from "express";

export type AuthedRequest = Request & { user?: { userId?: string; id?: string; role?: string } };

/**
 * Extract and validate user ID from request
 * @param req - Express request object
 * @returns User ID or throws error
 */
export const getUserIdFromRequest = (req: AuthedRequest): string => {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
        throw new Error("Chưa xác thực");
    }
    return userId;
};

/**
 * Get user role from request
 * @param req - Express request object
 * @returns User role or null
 */
export const getUserRoleFromRequest = (req: AuthedRequest): string | null => {
    return req.user?.role || null;
};

/**
 * Check if user is admin
 * @param req - Express request object
 * @returns true if user is admin
 */
export const isAdmin = (req: AuthedRequest): boolean => {
    return req.user?.role === "admin";
};

/**
 * Check if user is seller
 * @param req - Express request object
 * @returns true if user is seller
 */
export const isSeller = (req: AuthedRequest): boolean => {
    return req.user?.role === "seller";
};

/**
 * Check if user is regular user
 * @param req - Express request object
 * @returns true if user is regular user
 */
export const isRegularUser = (req: AuthedRequest): boolean => {
    return req.user?.role === "user";
};

/**
 * Require authentication middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requireAuthentication = (req: AuthedRequest, res: Response, next: Function) => {
    try {
        getUserIdFromRequest(req);
        next();
    } catch (error: any) {
        res.status(401).json({ message: error.message });
    }
};

/**
 * Get user info from request
 * @param req - Express request object
 * @returns User info object
 */
export const getUserInfo = (req: AuthedRequest) => {
    return {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
        isAuthenticated: !!req.user
    };
};
