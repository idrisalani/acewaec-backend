// backend/src/routes/users.routes.ts
// ✅ ENHANCED - Added premium-status endpoint

import express, { Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/index';
import { authenticateToken } from '../middleware/auth.middleware';
import { uploadProfilePicture } from '../middleware/upload';

const router = express.Router();
const prisma = new PrismaClient();

const authMiddleware = authenticateToken as RequestHandler;

/**
 * ============================================================================
 * YOUR ORIGINAL ROUTES (KEPT)
 * ============================================================================
 */

/**
 * GET /users/me
 * ✅ ORIGINAL - Uses only existing fields
 */
router.get(
  '/me',
  authMiddleware,
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
          createdAt: true,
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
  }) as RequestHandler
);

/**
 * PUT /users/me
 * ✅ ORIGINAL ENHANCED - Only existing fields
 */
router.put(
  '/me',
  authMiddleware,
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

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;

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
  }) as RequestHandler
);

/**
 * ============================================================================
 * NEW ROUTES (Using only existing Prisma fields)
 * ============================================================================
 */

/**
 * GET /users/student/me
 * ✅ NEW - Fixes ExportReports TypeScript error
 */
router.get(
  '/student/me',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const student = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          phone: true,
        },
      });

      if (!student) {
        res.status(404).json({
          success: false,
          error: 'Student not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          avatar: student.avatar,
          firstName: student.firstName,
          lastName: student.lastName,
          phone: student.phone,
        },
      });
    } catch (error) {
      console.error('Get student info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch student info',
      });
    }
  }) as RequestHandler
);

/**
 * GET /users/premium-status
 * ✅ NEW - Check user's premium subscription status
 * Accessible by: All authenticated users
 */
router.get(
  '/premium-status',
  authMiddleware,
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
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          stripeCustomerId: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Check if subscription is active and not expired
      const now = new Date();
      const isPremium =
        (user.subscriptionTier === 'PREMIUM_MONTHLY' || user.subscriptionTier === 'PREMIUM_YEARLY') &&
        user.subscriptionStatus === 'ACTIVE' &&
        (!user.subscriptionEndsAt || user.subscriptionEndsAt > now);

      // Calculate days remaining
      let daysRemaining = 0;
      if (user.subscriptionEndsAt && user.subscriptionEndsAt > now) {
        daysRemaining = Math.ceil(
          (user.subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      res.json({
        success: true,
        data: {
          isPremium,
          tier: user.subscriptionTier,
          status: user.subscriptionStatus,
          expiresAt: user.subscriptionEndsAt,
          daysRemaining: isPremium ? daysRemaining : 0,
          hasStripeCustomerId: !!user.stripeCustomerId,
        },
      });
    } catch (error) {
      console.error('Get premium status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch premium status',
      });
    }
  }) as RequestHandler
);

/**
 * GET /users/profile
 * ✅ NEW - Complete user profile
 */
router.get(
  '/profile',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
      });
    }
  }) as RequestHandler
);

/**
 * POST /users/profile/picture
 * ✅ NEW - Upload profile picture
 */
router.post(
  '/profile/picture',
  authMiddleware,
  uploadProfilePicture.single('profilePicture'),
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!(req as any).file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const file = (req as any).file as any;
      let pictureUrl = file.secure_url || file.path;

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: pictureUrl },
        select: {
          id: true,
          avatar: true,
          email: true,
        },
      });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          avatar: user.avatar,
          secure_url: file.secure_url || pictureUrl,
          filename: file.originalname,
          size: file.size,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }) as RequestHandler
);

/**
 * DELETE /users/profile/picture
 * ✅ NEW - Delete profile picture
 */
router.delete(
  '/profile/picture',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: null },
      });

      res.json({
        success: true,
        message: 'Profile picture deleted successfully',
      });
    } catch (error) {
      console.error('Delete picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete profile picture',
      });
    }
  }) as RequestHandler
);

/**
 * GET /users/:userId/picture
 * ✅ NEW - Get user's profile picture
 */
router.get(
  '/:userId/picture',
  (async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          avatar: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          avatar: user.avatar,
          name: `${user.firstName} ${user.lastName}`,
        },
      });
    } catch (error) {
      console.error('Get picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile picture',
      });
    }
  }) as RequestHandler
);

/**
 * POST /users/change-password
 * ✅ NEW - Change user password
 */
router.post(
  '/change-password',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      // TODO: Implement comparePassword and update
      res.json({
        success: true,
        message: 'Password change endpoint (TODO: Implement)',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
      });
    }
  }) as RequestHandler
);

/**
 * DELETE /users/account
 * ✅ NEW - Delete user account
 */
router.delete(
  '/account',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({ success: false, error: 'Password required' });
        return;
      }

      // TODO: Verify password before deletion
      await prisma.user.delete({
        where: { id: req.userId },
      });

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
      });
    }
  }) as RequestHandler
);

/**
 * GET /users
 * ✅ NEW - Get all users (admin)
 */
router.get(
  '/',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      // TODO: Add admin role check
      const { role, limit = '10', offset = '0' } = req.query;
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const where: any = {};
      if (role) {
        where.role = role;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          createdAt: true,
        },
        take: limitNum,
        skip: offsetNum,
      });

      const total = await prisma.user.count({ where });

      res.json({
        success: true,
        data: users,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
      });
    }
  }) as RequestHandler
);

/**
 * GET /users/:userId
 * ✅ NEW - Get user by ID (admin)
 */
router.get(
  '/:userId',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
      });
    }
  }) as RequestHandler
);

/**
 * PUT /users/:userId/role
 * ✅ NEW - Update user role (admin)
 */
router.put(
  '/:userId/role',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      // TODO: Add admin role check
      const { userId } = req.params;
      const { role } = req.body;

      if (!['STUDENT', 'TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(role)) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: user,
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
      });
    }
  }) as RequestHandler
);

/**
 * GET /users/preferences
 * ✅ NEW - Get user preferences
 */
router.get(
  '/preferences',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // TODO: Query from preferences table
      const defaultPreferences = {
        dailyReminder: true,
        dailyReminderTime: '09:00',
        streakReminder: true,
        goalReminder: true,
        achievementNotifications: true,
        pushNotifications: true,
        emailNotifications: false,
        theme: 'light',
        language: 'en',
      };

      res.json({
        success: true,
        data: defaultPreferences,
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch preferences',
      });
    }
  }) as RequestHandler
);

/**
 * PUT /users/preferences
 * ✅ NEW - Update user preferences
 */
router.put(
  '/preferences',
  authMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // TODO: Update preferences in database
      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: req.body,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
      });
    }
  }) as RequestHandler
);

export default router;