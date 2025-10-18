// backend/src/types/auth.types.ts
// ✅ RECONCILED - Combines both versions with middleware alignment

import { Request } from 'express';

/**
 * User roles in the system
 * - STUDENT: Regular student/user
 * - TEACHER: Teacher/educator
 * - TUTOR: Independent tutor
 * - SCHOOL_ADMIN: School administrator
 * - SUPER_ADMIN: System administrator (full access)
 */
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  TUTOR = 'TUTOR',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

/**
 * User data structure
 * Represents a user in the system
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ✅ MAIN: Extended Express Request with authenticated user
 * 
 * This interface matches the actual middleware implementation:
 * - req.userId: Set by auth middleware (primary access)
 * - req.userRole: Set by auth middleware (primary access)
 * - req.user: Optional, for backward compatibility or detailed user data
 * 
 * Usage examples:
 * 1. Primary pattern (middleware sets these):
 *    const userId = req.userId;
 *    const role = req.userRole;
 * 
 * 2. Backward compatible pattern:
 *    const user = req.user;
 *    if (user) {
 *      const { id, email, role } = user;
 *    }
 * 
 * 3. Combined pattern:
 *    const userId = req.userId || req.user?.id;
 */
export interface AuthRequest extends Request {
  // Primary properties set by middleware
  userId?: string;      // User ID from JWT token
  userRole?: UserRole;  // User role from JWT token

  // User object for backward compatibility and additional data
  user?: User;          // Full user object (optional)
}

/**
 * Helper type for role lists
 */
export type RoleList = UserRole[];

/**
 * Role-based access control type
 * Used for permission checking
 */
export type RequiredRoles = UserRole | UserRole[];

/**
 * Decoded JWT payload
 */
export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Authentication response type
 */
export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number; // In seconds
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Register credentials
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset with token
 */
export interface PasswordReset {
  token: string;
  newPassword: string;
}

export default AuthRequest;