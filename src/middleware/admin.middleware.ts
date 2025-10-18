import { Response, NextFunction } from 'express';
// import { AuthRequest } from './auth.middleware';
import { AuthRequest } from '../types/index';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};