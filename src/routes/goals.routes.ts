// backend/src/routes/goals.routes.ts
// ✅ FIXED - All TypeScript errors resolved with proper AuthRequest typing
// Routes for managing goals and study streaks

import { Router, Response } from 'express';
import { AuthRequest } from '../types/index';  // ✅ FIXED: Import AuthRequest
import { GoalsService, StreaksService } from '../services/goals.service';
import authMiddleware from '../middleware/auth.middleware';
import { GoalType, GoalStatus } from '@prisma/client';


const router = Router();
const goalsService = new GoalsService();
const streaksService = new StreaksService();

// ✅ FIXED: Middleware now has proper typing
const verifyGoalOwnership = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const goal = await goalsService.getGoalById(req.params.goalId);
    if (!goal || goal.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============= GOALS ROUTES =============

/**
 * POST /api/goals
 * Create a new goal
 * ✅ FIXED: Added AuthRequest type
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, goalType, targetValue, targetDate } = req.body;

    // Validation
    if (!title || !goalType || !targetValue || !targetDate) {
      return res.status(400).json({
        error: 'Missing required fields: title, goalType, targetValue, targetDate',
      });
    }

    if (!Object.values(GoalType).includes(goalType)) {
      return res.status(400).json({ error: 'Invalid goal type' });
    }

    const goal = await goalsService.createGoal(req.user.id, {
      title,
      description,
      type: goalType,  // ✅ FIXED: use goalType
      targetValue,
      dueDate: new Date(targetDate),
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * GET /api/goals
 * Get all goals for authenticated user
 * ✅ FIXED: Added AuthRequest type
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const goals = await goalsService.getUserGoals(
      req.user.id,
      status as GoalStatus
    );

    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * GET /api/goals/:goalId
 * Get specific goal
 */
router.get('/:goalId', authMiddleware, verifyGoalOwnership, async (req: AuthRequest, res: Response) => {
  try {
    const goal = await goalsService.getGoalById(req.params.goalId);
    res.json(goal);
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

/**
 * GET /api/goals/:goalId/progress
 * Get goal progress percentage
 */
router.get(
  '/:goalId/progress',
  authMiddleware,
  verifyGoalOwnership,
  async (req: AuthRequest, res: Response) => {
    try {
      const progress = await goalsService.getGoalProgress(req.params.goalId);
      if (progress === null) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json({ progress });
    } catch (error) {
      console.error('Error fetching goal progress:', error);
      res.status(500).json({ error: 'Failed to fetch goal progress' });
    }
  }
);

/**
 * PATCH /api/goals/:goalId/progress
 * Update goal progress
 */
router.patch(
  '/:goalId/progress',
  authMiddleware,
  verifyGoalOwnership,
  async (req: AuthRequest, res: Response) => {
    try {
      const { increment } = req.body;

      if (typeof increment !== 'number' || increment <= 0) {
        return res.status(400).json({ error: 'Invalid increment value' });
      }

      const updatedGoal = await goalsService.updateGoalProgress(
        req.params.goalId,
        increment
      );

      if (!updatedGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(updatedGoal);
    } catch (error) {
      console.error('Error updating goal progress:', error);
      res.status(500).json({ error: 'Failed to update goal progress' });
    }
  }
);

/**
 * POST /api/goals/:goalId/complete
 * Complete a goal
 */
router.post(
  '/:goalId/complete',
  authMiddleware,
  verifyGoalOwnership,
  async (req: AuthRequest, res: Response) => {
    try {
      const completedGoal = await goalsService.completeGoal(req.params.goalId);

      if (!completedGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(completedGoal);
    } catch (error) {
      console.error('Error completing goal:', error);
      res.status(500).json({ error: 'Failed to complete goal' });
    }
  }
);

/**
 * POST /api/goals/:goalId/pause
 * Pause a goal
 */
router.post(
  '/:goalId/pause',
  authMiddleware,
  verifyGoalOwnership,
  async (req: AuthRequest, res: Response) => {
    try {
      const pausedGoal = await goalsService.pauseGoal(req.params.goalId);

      if (!pausedGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(pausedGoal);
    } catch (error) {
      console.error('Error pausing goal:', error);
      res.status(500).json({ error: 'Failed to pause goal' });
    }
  }
);

/**
 * POST /api/goals/:goalId/resume
 * Resume a paused goal
 */
router.post(
  '/:goalId/resume',
  authMiddleware,
  verifyGoalOwnership,
  async (req: AuthRequest, res: Response) => {
    try {
      const resumedGoal = await goalsService.resumeGoal(req.params.goalId);

      if (!resumedGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(resumedGoal);
    } catch (error) {
      console.error('Error resuming goal:', error);
      res.status(500).json({ error: 'Failed to resume goal' });
    }
  }
);

/**
 * POST /api/goals/:goalId/abandon
 * Abandon a goal
 */
router.post(
  '/:goalId/abandon',
  authMiddleware,
  verifyGoalOwnership,
  async (req: AuthRequest, res: Response) => {
    try {
      const abandonedGoal = await goalsService.abandonGoal(req.params.goalId);

      if (!abandonedGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(abandonedGoal);
    } catch (error) {
      console.error('Error abandoning goal:', error);
      res.status(500).json({ error: 'Failed to abandon goal' });
    }
  }
);

/**
 * DELETE /api/goals/:goalId
 * Delete a goal
 */
router.delete(
  '/:goalId',
  authMiddleware,
  verifyGoalOwnership,
  async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await goalsService.deleteGoal(req.params.goalId);

      if (!deleted) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json({ success: true, message: 'Goal deleted' });
    } catch (error) {
      console.error('Error deleting goal:', error);
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  }
);

/**
 * GET /api/goals/summary
 * Get goals summary
 * ✅ FIXED: Added AuthRequest type
 */
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const summary = await goalsService.getGoalsSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching goals summary:', error);
    res.status(500).json({ error: 'Failed to fetch goals summary' });
  }
});

// ============= STREAKS ROUTES =============

/**
 * GET /api/streaks/my-streak
 * Get current user's streak
 * ✅ FIXED: Added AuthRequest type
 */
router.get('/my-streak', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await streaksService.getStreakStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching streak stats:', error);
    res.status(500).json({ error: 'Failed to fetch streak stats' });
  }
});

/**
 * POST /api/streaks/update
 * Update streak for user (called after completing practice session)
 * ✅ FIXED: Added AuthRequest type
 */
router.post('/update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const updatedStreak = await streaksService.updateStreak(req.user.id);
    res.json(updatedStreak);
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

/**
 * GET /api/streaks/leaderboard
 * Get top streaks leaderboard
 */
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const topStreaks = await streaksService.getTopStreaks(
      Math.min(parseInt(limit as string), 100)
    );

    res.json(topStreaks);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;