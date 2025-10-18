// backend/src/types/index.ts
// ✅ Central export point for all type definitions

// Auth types
export {
  UserRole,
  type User,
  type RoleList,
  type RequiredRoles,
  type JWTPayload,
  type AuthResponse,
  type LoginCredentials,
  type RegisterCredentials,
  type PasswordResetRequest,
  type PasswordReset,
} from './auth.types';

// Exam types
export {
  type ComprehensiveExam,
  type ExamDay,
  type ExamSession,
  ExamStatus,
  type ExamQuestion,
  type ExamSessionResult,
} from './exam.types';

// API types
export {
  type ApiResponse,
  type PaginatedResponse,
  type ApiErrorResponse,
  type PaginationOptions,
  type FilterOptions,
  type QueryOptions,
  type BulkOperationResponse,
  type FileUploadResponse,
} from './api.types';

// Re-export default for backward compatibility
export { default as AuthRequest } from './auth.types';