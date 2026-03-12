import mongoose from "mongoose";
import { AuthedRequest } from "./auth";

/**
 * Check if user owns the resource or is admin
 * @param req - Express request object
 * @param resourceUserId - User ID of the resource owner
 * @returns True if user has access
 */
export const checkOwnership = (req: AuthedRequest, resourceUserId: string): boolean => {
    const currentUserId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;

    // Admin can access everything
    if (userRole === "admin") {
        return true;
    }

    // User can access their own resources
    return currentUserId === resourceUserId;
};

/**
 * Check if user can access resource (owner or admin)
 * @param req - Express request object
 * @param resourceUserId - User ID of the resource owner
 * @throws Error if no access
 */
export const requireOwnership = (req: AuthedRequest, resourceUserId: string): void => {
    if (!checkOwnership(req, resourceUserId)) {
        throw new Error("Bạn không có quyền truy cập tài nguyên này");
    }
};

/**
 * Check if user is admin or resource owner
 * @param req - Express request object
 * @param resource - Resource document with userId field
 * @returns True if has access
 */
export const canAccessResource = (req: AuthedRequest, resource: any): boolean => {
    if (!resource || !resource.userId) {
        return false;
    }

    return checkOwnership(req, resource.userId.toString());
};

/**
 * Standard user population options
 */
export const userPopulationOptions = {
    select: "name email avatar role createdAt",
    options: { lean: true }
};

/**
 * Populate user information in query
 * @param query - Mongoose query
 * @param field - Field to populate (default: 'userId')
 * @returns Modified query
 */
export const populateUser = (query: any, field: string = "userId") => {
    return query.populate(field, userPopulationOptions.select, userPopulationOptions.options);
};

/**
 * Populate multiple user fields
 * @param query - Mongoose query
 * @param fields - Array of fields to populate
 * @returns Modified query
 */
export const populateUsers = (query: any, fields: string[]) => {
    let modifiedQuery = query;
    for (const field of fields) {
        modifiedQuery = populateUser(modifiedQuery, field);
    }
    return modifiedQuery;
};

/**
 * Create pagination query
 * @param model - Mongoose model
 * @param filter - Query filter
 * @param pagination - Pagination options
 * @returns Query with pagination
 */
export const createPaginatedQuery = (model: any, filter: any, pagination: { page: number; limit: number; skip: number }) => {
    return model
        .find(filter)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .sort({ createdAt: -1 });
};

/**
 * Get total count for pagination
 * @param model - Mongoose model
 * @param filter - Query filter
 * @returns Total count promise
 */
export const getTotalCount = (model: any, filter: any) => {
    return model.countDocuments(filter);
};

/**
 * Soft delete helper
 * @param model - Mongoose model
 * @param id - Document ID
 * @param userId - User ID performing the delete
 * @returns Update promise
 */
export const softDelete = (model: any, id: string, userId: string) => {
    return model.findByIdAndUpdate(
        id,
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: userId
            }
        },
        { new: true }
    );
};

/**
 * Check if document exists and user has access
 * @param model - Mongoose model
 * @param id - Document ID
 * @param req - Express request object
 * @param additionalFilter - Additional query filter
 * @returns Document if found and accessible
 */
export const findAccessibleDocument = async (
    model: any,
    id: string,
    req: AuthedRequest,
    additionalFilter: any = {}
) => {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;

    let filter: any = { _id: id, ...additionalFilter };

    // If not admin, only show user's own documents
    if (userRole !== "admin" && model.schema.paths.userId) {
        filter.userId = userId;
    }

    const document = await model.findOne(filter);

    if (!document) {
        throw new Error("Không tìm thấy tài nguyên");
    }

    // Additional ownership check if document has userId field
    if (document.userId && !checkOwnership(req, document.userId.toString())) {
        throw new Error("Bạn không có quyền truy cập tài nguyên này");
    }

    return document;
};

/**
 * Standard sort options for createdAt
 */
export const sortByCreatedAt = { createdAt: -1 };

/**
 * Standard sort options for updatedAt
 */
export const sortByUpdatedAt = { updatedAt: -1 };

/**
 * Create text search filter
 * @param searchTerm - Search term
 * @param fields - Fields to search in
 * @returns MongoDB text search filter
 */
export const createTextSearchFilter = (searchTerm: string, fields: string[]) => {
    if (!searchTerm) {
        return {};
    }

    return {
        $or: fields.map(field => ({
            [field]: { $regex: searchTerm, $options: 'i' }
        }))
    };
};

/**
 * Validate and convert string to ObjectId
 * @param id - String ID
 * @returns ObjectId
 */
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID không hợp lệ");
    }
    return new mongoose.Types.ObjectId(id);
};

/**
 * Create date range filter
 * @param startDate - Start date
 * @param endDate - End date
 * @param field - Date field name (default: 'createdAt')
 * @returns Date range filter
 */
export const createDateRangeFilter = (startDate?: string, endDate?: string, field: string = "createdAt") => {
    const filter: any = {};

    if (startDate) {
        filter[field] = { $gte: new Date(startDate) };
    }

    if (endDate) {
        if (filter[field]) {
            filter[field].$lte = new Date(endDate);
        } else {
            filter[field] = { $lte: new Date(endDate) };
        }
    }

    return filter;
};
