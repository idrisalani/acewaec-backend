// backend/src/types/express.ts
// ✅ Extend Express Request to include custom properties

import { Request } from 'express';

/**
 * Define valid user roles
 * Use this type instead of generic string
 */
export type UserRole = 'admin' | 'user' | 'tutor' | 'teacher' | 'student';

/**
 * Extended Express Request with authentication properties
 * Use this in all controllers and middleware that need user info
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole; // ✅ FIXED: Use UserRole type instead of string
  user?: {
    id: string;
    email: string;
    role: UserRole; // ✅ FIXED: Use UserRole type
  };
}

// Or use declaration merging to extend the default Request:
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export default AuthenticatedRequest;