// backend/src/routes/users.routes.ts
// ✅ FIXED - Both async handlers cast to RequestHandler

import express, { Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/index';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Cast middleware to RequestHandler
const authMiddleware = authenticateToken as RequestHandler;

/**
 * GET /users/me
 * ✅ FIXED Line 24: Async handler wrapped and cast to RequestHandler
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
  }) as RequestHandler  // ✅ CAST HERE
);

/**
 * PUT /users/me
 * ✅ FIXED Line 75: Async handler wrapped and cast to RequestHandler
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
  }) as RequestHandler  // ✅ CAST HERE
);

export default router;