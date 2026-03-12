// Utils
export * from "./utils/auth";
export * from "./utils/response";
export * from "./utils/validation";
export { 
    checkOwnership as dbCheckOwnership,
    requireOwnership,
    canAccessResource,
    findAccessibleDocument,
    populateUser,
    populateUsers,
    createPaginatedQuery,
    getTotalCount,
    softDelete,
    userPopulationOptions,
    sortByCreatedAt,
    sortByUpdatedAt,
    createTextSearchFilter,
    toObjectId,
    createDateRangeFilter
} from "./utils/database";
export * from "./utils/cloudinary";

// Middleware
export * from "./middleware/asyncHandler";
export * from "./middleware/pagination";
export * from "./middleware/ownership";

// Types
export { 
    AuthedRequest as SharedAuthedRequest,
    PaginationInfo,
    ApiResponse,
    PaginatedResponse,
    UserInfo,
    QueryOptions,
    FileUploadOptions,
    CloudinaryUploadResult,
    ErrorType,
    StandardError,
    UserRole,
    MessageType,
    OrderStatus,
    NotificationType,
    SortDirection,
    SortOption,
    FilterOptions,
    BaseDocument,
    UserDocument,
    SoftDeleteDocument,
    ActiveStatusDocument
} from "./types/common";
