// backend/src/routes/goals.routes.ts
// ✅ FIXED - Handles Prisma Decimal types correctly

import express, { Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/index';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

const authMiddleware = authenticateToken as RequestHandler;

/**
 * GET /goals
 * Get all user learning goals
 * Accessible by: All authenticated users
 */
router.get(
  '/',
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

      // TODO: Replace with actual goals table queries when created
      // For now, return mock data based on user's performance analytics

      const analytics = await prisma.performanceAnalytics.findMany({
        where: { userId: req.userId },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Calculate suggested goals based on weak areas
      const goals = analytics.map((analytic) => ({
        id: `goal-${analytic.id}`,
        userId: req.userId,
        subjectId: analytic.subjectId,
        subjectName: analytic.subject.name,
        type: 'accuracy', // accuracy, speed, completion
        targetValue: Math.ceil(Number(analytic.accuracyRate)) + 10, // Improve by 10% - FIX: Convert Decimal
        currentValue: Math.floor(Number(analytic.accuracyRate)), // FIX: Convert Decimal
        status: 'active',
        createdAt: analytic.createdAt,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        progress: Math.floor(Number(analytic.accuracyRate)), // FIX: Convert Decimal
      }));

      // Add default goals if no analytics yet
      if (goals.length === 0) {
        goals.push(
          {
            id: 'goal-default-1',
            userId: req.userId,
            subjectId: null,
            subjectName: 'All Subjects',
            type: 'completion',
            targetValue: 100, // Complete 100 practice sessions
            currentValue: 0,
            status: 'active',
            createdAt: new Date(),
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            progress: 0,
          },
          {
            id: 'goal-default-2',
            userId: req.userId,
            subjectId: null,
            subjectName: 'Accuracy',
            type: 'accuracy',
            targetValue: 80,
            currentValue: 0,
            status: 'active',
            createdAt: new Date(),
            dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            progress: 0,
          }
        );
      }

      res.json({
        success: true,
        data: goals,
      });
    } catch (error) {
      console.error('Get goals error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch goals',
      });
    }
  }) as RequestHandler
);

/**
 * GET /goals/:goalId
 * Get specific goal with detailed progress
 * Accessible by: All authenticated users
 */
router.get(
  '/:goalId',
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

      const { goalId } = req.params;

      // TODO: Replace with actual goal lookup
      res.json({
        success: true,
        data: {
          id: goalId,
          userId: req.userId,
          type: 'accuracy',
          status: 'active',
          targetValue: 90,
          currentValue: 75,
          progress: 83,
          createdAt: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          progressHistory: [
            { date: '2025-10-01', value: 60 },
            { date: '2025-10-08', value: 68 },
            { date: '2025-10-15', value: 72 },
            { date: '2025-10-22', value: 75 },
          ],
        },
      });
    } catch (error) {
      console.error('Get goal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch goal',
      });
    }
  }) as RequestHandler
);

/**
 * POST /goals
 * Create a new learning goal
 * Accessible by: All authenticated users
 */
router.post(
  '/',
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

      const { subjectId, type, targetValue, dueDate } = req.body;

      if (!type || !targetValue) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: type, targetValue',
        });
        return;
      }

      // TODO: Create goal in database
      const newGoal = {
        id: `goal-${Date.now()}`,
        userId: req.userId,
        subjectId,
        type,
        targetValue,
        currentValue: 0,
        status: 'active',
        createdAt: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        progress: 0,
      };

      res.status(201).json({
        success: true,
        data: newGoal,
      });
    } catch (error) {
      console.error('Create goal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create goal',
      });
    }
  }) as RequestHandler
);

/**
 * PUT /goals/:goalId
 * Update a learning goal
 * Accessible by: All authenticated users
 */
router.put(
  '/:goalId',
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

      const { goalId } = req.params;
      const { targetValue, status, dueDate } = req.body;

      // TODO: Update goal in database
      res.json({
        success: true,
        data: {
          id: goalId,
          userId: req.userId,
          targetValue: targetValue || 90,
          status: status || 'active',
          dueDate: dueDate ? new Date(dueDate) : new Date(),
        },
      });
    } catch (error) {
      console.error('Update goal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update goal',
      });
    }
  }) as RequestHandler
);

/**
 * DELETE /goals/:goalId
 * Delete a learning goal
 * Accessible by: All authenticated users
 */
router.delete(
  '/:goalId',
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

      const { goalId } = req.params;

      // TODO: Delete goal from database

      res.json({
        success: true,
        message: 'Goal deleted successfully',
        data: { goalId },
      });
    } catch (error) {
      console.error('Delete goal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete goal',
      });
    }
  }) as RequestHandler
);

export default router;