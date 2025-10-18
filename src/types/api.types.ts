// backend/src/types/api.types.ts
// ✅ API response and pagination types (extracted from auth.types reconciliation)

/**
 * Standard API Response wrapper
 * Used for all API endpoints to ensure consistent response format
 * 
 * Usage:
 * ```typescript
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: user,
 *   message: 'User created successfully'
 * };
 * ```
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string; // Error code for categorization
  timestamp?: Date;
}

/**
 * Paginated API Response
 * Used for endpoints that return multiple items with pagination
 * 
 * Usage:
 * ```typescript
 * const response: PaginatedResponse<Question> = {
 *   success: true,
 *   data: questions,
 *   total: 1000,
 *   page: 1,
 *   limit: 20,
 *   totalPages: 50
 * };
 * ```
 */
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * API Error Response
 * Standardized error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Pagination Query Parameters
 * Standard pagination options for list endpoints
 */
export interface PaginationOptions {
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  skip?: number;        // Alternative to page-based pagination
  sortBy?: string;      // Field to sort by
  sortOrder?: 'asc' | 'desc'; // Sort direction
}

/**
 * Filter options for list queries
 */
export interface FilterOptions {
  search?: string;
  filters?: Record<string, any>;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Combined query options for list endpoints
 */
export interface QueryOptions extends PaginationOptions, FilterOptions {}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success: boolean;
  totalProcessed: number;
  succeeded: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * File upload response (for use with Cloudinary/Local storage)
 */
export interface FileUploadResponse {
  success: boolean;
  url: string;          // Public URL of uploaded file
  filename: string;
  size: number;         // File size in bytes
  mimetype: string;
  publicId?: string;    // Cloudinary public_id
  secure_url?: string;  // Cloudinary secure URL
}

export default ApiResponse;