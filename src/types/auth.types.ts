// backend/src/types/auth.types.ts
// ✅ FIXED - Removed conflicting File import

import { Request } from 'express';

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  TUTOR = 'TUTOR',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ✅ FIXED: Removed File import, multer types come from @types/multer
 */
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
  user?: User;
  // file and files are already declared by @types/multer
}

export type RoleList = UserRole[];
export type RequiredRoles = UserRole | UserRole[];

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export default AuthRequest;