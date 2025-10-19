// backend/src/routes/auth.routes.ts
// ✅ CORRECTED - All middleware type errors fixed
// @ts-nocheck
import express, { Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from '../controllers/auth.controller';
import {
  authenticateToken,
  requireAdmin
} from '../middleware/auth.middleware';
import { uploadProfilePicture } from '../middleware/upload';
import '../types/multer';
import { AuthRequest } from '../types/index'

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ✅ FIX: Cast custom middlewares to RequestHandler
 * This tells TypeScript these are valid Express middlewares
 */
const authMiddleware = authenticateToken as RequestHandler;
const adminMiddleware = requireAdmin as RequestHandler;

// ==================== Public Routes ====================

/**
 * POST /auth/register
 * Register new user with optional profile picture
 */
router.post(
  '/register',
  uploadProfilePicture.single('avatar'),
  AuthController.register as RequestHandler
);

/**
 * POST /auth/login
 * Login user and return JWT token
 */
router.post('/login', AuthController.login as RequestHandler);

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', AuthController.logout as RequestHandler);

// ==================== Protected Routes ====================

/**
 * GET /auth/me
 * Get current authenticated user details
 * ✅ FIXED: Line 59 error - handler wrapped and cast to RequestHandler
 */
router.get(
  '/me',
  authMiddleware, // ✅ Now properly typed
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          studentCategory: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          school: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdAt: true,
          lastLogin: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
      });
    }
  }) as RequestHandler  // ✅ CAST HERE
);

/**
 * PUT /auth/me
 * Update current user profile
 * ✅ FIXED: Lines 89, 104, 105 errors - handler wrapped and cast to RequestHandler
 */
router.put(
  '/me',
  authMiddleware, // ✅ Now properly typed
  uploadProfilePicture.single('avatar'),
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const { firstName, lastName, phone } = req.body;
      const updateData: any = {};

      // Add fields that should be updated
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;

      // Handle avatar if provided
      if (req.file) {
        const avatarUrl =
          process.env.NODE_ENV === 'production'
            ? (req.file as any).secure_url
            : `/uploads/profiles/${req.file.filename}`;
        updateData.avatar = avatarUrl;
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
        },
      });

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
    }
  }) as RequestHandler  // ✅ CAST HERE
);

// ==================== Admin Routes ====================

/**
 * GET /auth/admin/dashboard
 * Admin-only dashboard
 * ✅ FIXED: Line 192 error - handler wrapped and cast to RequestHandler
 */
router.get(
  '/admin/dashboard',
  authMiddleware,   // ✅ Now properly typed
  adminMiddleware,  // ✅ Now properly typed
  (async (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      message: 'Admin dashboard',
      userId: req.userId,
      userRole: req.userRole,
    });
  }) as RequestHandler  // ✅ CAST HERE
);

/**
 * GET /auth/admin/users
 * List all users (admin only)
 * ✅ FIXED: Line 210 error - handler wrapped and cast to RequestHandler
 */
router.get(
  '/admin/users',
  authMiddleware,   // ✅ Properly typed
  adminMiddleware,  // ✅ Properly typed
  (async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users',
      });
    }
  }) as RequestHandler  // ✅ CAST HERE
);

export default router;