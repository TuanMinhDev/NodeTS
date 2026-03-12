import { Request, Response, NextFunction } from "express";
import { AuthedRequest } from "../utils/auth";
import { requireOwnership, canAccessResource } from "../utils/database";
import { forbiddenResponse } from "../utils/response";

/**
 * Ownership check middleware
 * @param getResourceUserId - Function to get resource user ID from request
 * @returns Middleware function
 */
export const checkOwnership = (getResourceUserId: (req: Request) => string) => {
    return (req: AuthedRequest, res: Response, next: NextFunction) => {
        try {
            const resourceUserId = getResourceUserId(req);
            requireOwnership(req, resourceUserId);
            next();
        } catch (error: any) {
            return forbiddenResponse(res, error.message);
        }
    };
};

/**
 * Admin or owner middleware
 * @param getResourceUserId - Function to get resource user ID from request
 * @returns Middleware function
 */
export const adminOrOwner = (getResourceUserId: (req: Request) => string) => {
    return (req: AuthedRequest, res: Response, next: NextFunction) => {
        try {
            const resourceUserId = getResourceUserId(req);
            
            // Admin can access everything
            if (req.user?.role === "admin") {
                return next();
            }
            
            // Check ownership
            requireOwnership(req, resourceUserId);
            next();
        } catch (error: any) {
            return forbiddenResponse(res, error.message);
        }
    };
};

/**
 * Resource access check middleware
 * @param model - Mongoose model
 * @param paramField - Parameter field name (default: 'id')
 * @param additionalFilter - Additional query filter
 * @returns Middleware function
 */
export const checkResourceAccess = (
    model: any,
    paramField: string = "id",
    additionalFilter: any = {}
) => {
    return async (req: AuthedRequest, res: Response, next: NextFunction) => {
        try {
            const resourceId = req.params[paramField];
            const resource = await model.findOne({ 
                _id: resourceId, 
                ...additionalFilter 
            });

            if (!resource) {
                return forbiddenResponse(res, "Không tìm thấy tài nguyên");
            }

            if (!canAccessResource(req, resource)) {
                return forbiddenResponse(res, "Bạn không có quyền truy cập tài nguyên này");
            }

            // Add resource to request for later use
            (req as any).resource = resource;
            next();
        } catch (error: any) {
            return forbiddenResponse(res, error.message);
        }
    };
};
