// backend/src/middleware/auth.middleware.ts
// ✅ ERROR-FREE - Properly typed and working with asyncHandler + AuthRequest pattern

import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/index';

/**
 * JWT Payload Interface
 * Defines the structure of decoded JWT tokens
 */
interface JWTPayload {
  userId: string;
  userRole: UserRole;
  email?: string;
}

/**
 * Extend Express Request with auth properties
 * This ensures proper typing throughout the application
 */
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user data to request
 * 
 * @param req - Express request with AuthRequest interface
 * @param res - Express response
 * @param next - Next middleware function
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log('\n🔐 ===== AUTH MIDDLEWARE =====');
  console.log('🔐 Path:', req.method, req.path);
  
  try {
    // Extract authorization header
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth header exists:', !!authHeader);
    
    if (!authHeader) {
      console.log('❌ No authorization header provided');
      res.status(401).json({
        success: false,
        error: 'No authorization header'
      });
      return;
    }

    // Parse "Bearer TOKEN" format
    const parts = authHeader.split(' ');
    console.log('🔐 Header format - Expected: [Bearer, TOKEN], Got:', parts.length, 'parts');
    
    if (parts[0] !== 'Bearer' || !parts[1]) {
      console.log('❌ Invalid header format - expected "Bearer TOKEN"');
      res.status(401).json({
        success: false,
        error: 'Invalid authorization format. Expected: Bearer <token>'
      });
      return;
    }

    const token = parts[1];
    console.log('🔐 Token extracted - Length:', token.length);
    console.log('🔐 Token preview:', token.substring(0, 30) + '...');
    
    // Get JWT secret from environment or use default for development
    const secret = process.env.JWT_SECRET || 'acewaec-super-secret-jwt-key-2024';
    console.log('🔐 Using secret (first 15 chars):', secret.substring(0, 15) + '...');
    
    // Verify and decode token
    console.log('🔐 Attempting to verify token...');
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    console.log('✅ TOKEN VERIFIED SUCCESSFULLY');
    console.log('✅ User ID:', decoded.userId);
    console.log('✅ User Role:', decoded.userRole);
    console.log('✅ Email:', decoded.email || 'not provided');
    
    // Attach decoded data to request
    req.userId = decoded.userId;
    req.userRole = decoded.userRole;
    
    // Also attach as user object for backward compatibility
    req.user = {
      id: decoded.userId,
      email: decoded.email || '',
      role: decoded.userRole,
    };
    
    console.log('===================================\n');
    next();
    
  } catch (error: any) {
    console.log('\n❌ ===== TOKEN VERIFICATION FAILED =====');
    console.log('❌ Error name:', error.name);
    console.log('❌ Error message:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token has expired');
      res.status(401).json({
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Token signature is invalid');
      res.status(401).json({
        success: false,
        error: 'Invalid token signature',
        code: 'INVALID_TOKEN'
      });
      return;
    }
    
    console.log('❌ Unexpected error:', error);
    console.log('=========================================\n');
    
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Role-Based Authorization Middleware Factory
 * Creates middleware that checks if user has required roles
 * 
 * Accepts both string literals and UserRole enum values
 * 
 * @param roles - Array of allowed role values (string or UserRole)
 * @returns Middleware function
 */
export const requireRole = (roles: (UserRole | string)[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    console.log('\n🔒 ===== ROLE CHECK =====');
    console.log('🔒 User Role:', req.userRole);
    console.log('🔒 Required Roles:', roles);
    
    if (!req.userRole) {
      console.log('❌ No user role found in request');
      res.status(401).json({
        success: false,
        error: 'User role not found. Authentication required.'
      });
      return;
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.userRole)) {
      console.log('❌ User role not in allowed roles');
      console.log('=======================\n');
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions for this resource',
        userRole: req.userRole,
        requiredRoles: roles
      });
      return;
    }

    console.log('✅ Role check passed');
    console.log('=======================\n');
    next();
  };
};

/**
 * Admin-Only Authorization Middleware
 * Requires user to have SUPER_ADMIN role
 */
export const requireAdmin = requireRole(['SUPER_ADMIN']);

/**
 * School Admin Authorization Middleware
 * Requires user to have SCHOOL_ADMIN or SUPER_ADMIN role
 */
export const requireSchoolAdmin = requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']);

/**
 * Teacher Authorization Middleware
 * Requires user to have TEACHER, SCHOOL_ADMIN, or SUPER_ADMIN role
 */
export const requireTeacher = requireRole(['TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);

/**
 * Tutor Authorization Middleware
 * Requires user to have TUTOR role
 */
export const requireTutor = requireRole(['TUTOR']);

/**
 * Helper function: Check if user is admin
 */
export const isAdmin = (userRole: UserRole | string | undefined): boolean => {
  return userRole === 'SUPER_ADMIN' || userRole === UserRole.SUPER_ADMIN;
};

/**
 * Helper function: Check if user is school admin
 */
export const isSchoolAdmin = (userRole: UserRole | string | undefined): boolean => {
  return userRole === 'SCHOOL_ADMIN' || 
         userRole === 'SUPER_ADMIN' ||
         userRole === UserRole.SCHOOL_ADMIN ||
         userRole === UserRole.SUPER_ADMIN;
};

/**
 * Helper function: Check if user is educator (teacher or admin)
 */
export const isEducator = (userRole: UserRole | string | undefined): boolean => {
  return userRole === 'TEACHER' ||
         userRole === 'SCHOOL_ADMIN' ||
         userRole === 'SUPER_ADMIN' ||
         userRole === UserRole.TEACHER ||
         userRole === UserRole.SCHOOL_ADMIN ||
         userRole === UserRole.SUPER_ADMIN;
};

/**
 * Helper function: Check if user is tutor
 */
export const isTutor = (userRole: UserRole | string | undefined): boolean => {
  return userRole === 'TUTOR' || userRole === UserRole.TUTOR;
};

export default authenticateToken;