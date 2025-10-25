// backend/src/routes/streaks.routes.ts
// ✅ NEW - Streak tracking endpoints

import express, { Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/index';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

const authMiddleware = authenticateToken as RequestHandler;

/**
 * GET /streaks/data
 * Get user's current streak and streak history
 * Accessible by: All authenticated users
 */
router.get(
  '/data',
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

      // Get today's date (without time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get practice sessions for today and past days
      const userSessions = await prisma.practiceSession.findMany({
        where: {
          userId: req.userId,
          status: 'COMPLETED',
        },
        select: {
          completedAt: true,
          correctAnswers: true,
          totalQuestions: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      // Calculate current streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      if (userSessions.length > 0) {
        userSessions.forEach((session, index) => {
          if (!session.completedAt) return;

          const sessionDate = new Date(session.completedAt);
          sessionDate.setHours(0, 0, 0, 0);

          if (index === 0) {
            // Check if first session is today or yesterday
            const daysDiff = Math.floor(
              (today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            currentStreak = daysDiff <= 1 ? 1 : 0;
            tempStreak = 1;
            lastDate = sessionDate;
          } else if (lastDate) {
            const daysDiff = Math.floor(
              (lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff === 1) {
              tempStreak++;
              if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
              }
            } else if (daysDiff > 1) {
              tempStreak = 1;
            }
            lastDate = sessionDate;
          }
        });
      }

      // Get streak data for the last 30 days
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSessions = await prisma.practiceSession.findMany({
        where: {
          userId: req.userId,
          status: 'COMPLETED',
          completedAt: {
            gte: thirtyDaysAgo,
            lt: tomorrow,
          },
        },
        select: {
          completedAt: true,
          totalQuestions: true,
          correctAnswers: true,
        },
      });

      // Group by date
      const streakByDate: { [key: string]: { date: string; sessions: number; score: number } } = {};

      recentSessions.forEach((session) => {
        if (session.completedAt) {
          const dateKey = session.completedAt.toISOString().split('T')[0];
          if (!streakByDate[dateKey]) {
            streakByDate[dateKey] = { date: dateKey, sessions: 0, score: 0 };
          }
          streakByDate[dateKey].sessions += 1;
          if (session.totalQuestions > 0) {
            streakByDate[dateKey].score = Math.round(
              (session.correctAnswers / session.totalQuestions) * 100
            );
          }
        }
      });

      res.json({
        success: true,
        data: {
          currentStreak,
          longestStreak: Math.max(longestStreak, currentStreak),
          totalSessions: userSessions.length,
          lastPracticedAt: userSessions[0]?.completedAt || null,
          streakCalendar: Object.values(streakByDate),
        },
      });
    } catch (error) {
      console.error('Get streak data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch streak data',
      });
    }
  }) as RequestHandler
);

/**
 * GET /streaks/summary
 * Get quick streak summary
 * Accessible by: All authenticated users
 */
router.get(
  '/summary',
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if user practiced today
      const todaySessions = await prisma.practiceSession.count({
        where: {
          userId: req.userId,
          status: 'COMPLETED',
          completedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      res.json({
        success: true,
        data: {
          practiceToday: todaySessions > 0,
          sessionsCount: todaySessions,
        },
      });
    } catch (error) {
      console.error('Get streak summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch streak summary',
      });
    }
  }) as RequestHandler
);

export default router;