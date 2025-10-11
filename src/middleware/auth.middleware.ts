import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log('\n🔐 ===== AUTH MIDDLEWARE =====');
  console.log('🔐 Path:', req.method, req.path);
  console.log('🔐 JWT_SECRET:', process.env.JWT_SECRET?.substring(0, 15) + '...');
  
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth header exists:', !!authHeader);
    
    if (!authHeader) {
      console.log('❌ No auth header');
      return res.status(401).json({
        success: false,
        error: 'No authorization header'
      });
    }

    const parts = authHeader.split(' ');
    console.log('🔐 Header parts:', parts.length, '- First:', parts[0]);
    
    if (parts[0] !== 'Bearer' || !parts[1]) {
      console.log('❌ Invalid header format');
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format'
      });
    }

    const token = parts[1];
    console.log('🔐 Token length:', token.length);
    console.log('🔐 Token preview:', token.substring(0, 50) + '...');
    
    const secret = process.env.JWT_SECRET || 'acewaec-super-secret-jwt-key-2024';
    console.log('🔐 Using secret:', secret.substring(0, 15) + '...');
    
    console.log('🔐 About to verify token...');
    const decoded = jwt.verify(token, secret) as { userId: string };
    
    console.log('✅ TOKEN VERIFIED!');
    console.log('✅ User ID:', decoded.userId);
    
    req.userId = decoded.userId;
    next();
    
  } catch (error: any) {
    console.log('\n❌ ===== VERIFICATION FAILED =====');
    console.log('❌ Error name:', error.name);
    console.log('❌ Error message:', error.message);
    console.log('❌ Full error:', error);
    console.log('===================================\n');
    
    return res.status(403).json({
      success: false,
      error: 'Invalid token type'
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

// ADD THIS: Convenience middleware for admin-only routes
export const requireAdmin = requireRole(['SUPER_ADMIN']);