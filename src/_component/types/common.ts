import { Request } from "express";

/**
 * Authenticated request type
 */
export interface AuthedRequest extends Request {
    user?: {
        userId?: string;
        id?: string;
        role?: string;
    };
}

/**
 * Pagination info
 */
export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

/**
 * API Response structure
 */
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    statusCode: number;
    data?: T;
    error?: any;
}

/**
 * Paginated Response structure
 */
export interface PaginatedResponse<T = any> extends ApiResponse<{
    items: T[];
    pagination: PaginationInfo;
}> {}

/**
 * User information
 */
export interface UserInfo {
    userId: string;
    role: string;
    isAuthenticated: boolean;
}

/**
 * Database query options
 */
export interface QueryOptions {
    page?: number;
    limit?: number;
    sort?: any;
    populate?: string | string[];
    select?: string;
    lean?: boolean;
}

/**
 * File upload options
 */
export interface FileUploadOptions {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
    folder?: string;
}

/**
 * Cloudinary upload result
 */
export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    format: string;
    resource_type: string;
    bytes: number;
    created_at: string;
}

/**
 * Error types
 */
export enum ErrorType {
    VALIDATION = "VALIDATION_ERROR",
    AUTHENTICATION = "AUTHENTICATION_ERROR",
    AUTHORIZATION = "AUTHORIZATION_ERROR",
    NOT_FOUND = "NOT_FOUND_ERROR",
    DUPLICATE = "DUPLICATE_ERROR",
    SERVER = "SERVER_ERROR",
    FILE_UPLOAD = "FILE_UPLOAD_ERROR"
}

/**
 * Standard error structure
 */
export interface StandardError {
    type: ErrorType;
    message: string;
    details?: any;
    statusCode: number;
}

/**
 * User roles
 */
export enum UserRole {
    ADMIN = "admin",
    SELLER = "seller",
    USER = "user"
}

/**
 * Message types
 */
export enum MessageType {
    TEXT = "text",
    IMAGE = "image"
}

/**
 * Order status
 */
export enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PREPARING = "preparing",
    SHIPPING = "shipping",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    RETURNED = "returned"
}

/**
 * Notification types
 */
export enum NotificationType {
    SYSTEM = "system",
    ORDER = "order",
    PRODUCT = "product",
    COMMENT = "comment",
    FOLLOWER = "follower"
}

/**
 * Sort direction
 */
export enum SortDirection {
    ASC = "asc",
    DESC = "desc"
}

/**
 * Sort options
 */
export interface SortOption {
    field: string;
    direction: SortDirection;
}

/**
 * Filter options
 */
export interface FilterOptions {
    search?: string;
    dateRange?: {
        start?: string;
        end?: string;
    };
    status?: string | string[];
    category?: string | string[];
    [key: string]: any;
}

/**
 * Common database fields
 */
export interface BaseDocument {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Document with user reference
 */
export interface UserDocument extends BaseDocument {
    userId: string;
}

/**
 * Document with soft delete
 */
export interface SoftDeleteDocument extends BaseDocument {
    isDeleted?: boolean;
    deletedAt?: Date;
    deletedBy?: string;
}

/**
 * Active status document
 */
export interface ActiveStatusDocument extends BaseDocument {
    isActive: boolean;
}
