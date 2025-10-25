// backend/src/routes/analytics.routes.ts
// ✅ FIXED - Handles Prisma Decimal types correctly

import express, { Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/index';
import { authenticateToken, requireTeacher } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

const authMiddleware = authenticateToken as RequestHandler;
const teacherMiddleware = requireTeacher as RequestHandler;

/**
 * GET /analytics/dashboard
 * Get user's dashboard analytics (overview of performance)
 * Accessible by: All authenticated users
 */
router.get(
  '/dashboard',
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

      // Get user's performance analytics
      const analytics = await prisma.performanceAnalytics.findMany({
        where: { userId: req.userId },
        include: {
          subject: true,
        },
        take: 10,
      });

      // Get recent practice sessions
      const recentSessions = await prisma.practiceSession.findMany({
        where: { userId: req.userId },
        select: {
          id: true,
          totalQuestions: true,
          correctAnswers: true,
          score: true,
          completedAt: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
      });

      // Calculate overall stats - FIX: Convert Decimal to number
      const totalAttempts = analytics.reduce((sum, a) => sum + a.totalAttempts, 0);
      const totalCorrect = analytics.reduce((sum, a) => sum + a.correctAnswers, 0);
      const averageAccuracy =
        analytics.length > 0
          ? Math.round(
              analytics.reduce((sum, a) => sum + Number(a.accuracyRate), 0) / analytics.length
            )
          : 0;

      res.json({
        success: true,
        data: {
          overview: {
            totalAttempts,
            totalCorrect,
            averageAccuracy,
            totalSessions: recentSessions.length,
          },
          bySubject: analytics.map((a) => ({
            subjectId: a.subjectId,
            subjectName: a.subject.name,
            attempts: a.totalAttempts,
            correct: a.correctAnswers,
            accuracy: Math.round(Number(a.accuracyRate)),
          })),
          recentSessions: recentSessions.map((s) => ({
            id: s.id,
            totalQuestions: s.totalQuestions,
            correctAnswers: s.correctAnswers,
            score: s.score ? Number(s.score) : null,
            completedAt: s.completedAt,
          })),
        },
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
      });
    }
  }) as RequestHandler
);

/**
 * GET /analytics/subjects/:subjectId
 * Get subject-specific analytics and performance
 * Accessible by: All authenticated users
 */
router.get(
  '/subjects/:subjectId',
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

      const { subjectId } = req.params;

      const analytics = await prisma.performanceAnalytics.findFirst({
        where: {
          userId: req.userId,
          subjectId,
        },
        include: {
          subject: true,
        },
      });

      if (!analytics) {
        res.status(404).json({
          success: false,
          error: 'No analytics found for this subject',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          subject: analytics.subject.name,
          totalAttempts: analytics.totalAttempts,
          correctAnswers: analytics.correctAnswers,
          wrongAnswers: analytics.wrongAnswers,
          accuracy: Math.round(Number(analytics.accuracyRate)),
          averageTimePerQuestion: analytics.averageTimePerQ,
          difficulty: {
            easy: {
              correct: analytics.easyCorrect,
              total: analytics.easyTotal,
              percentage: analytics.easyTotal > 0 ? Math.round((analytics.easyCorrect / analytics.easyTotal) * 100) : 0,
            },
            medium: {
              correct: analytics.mediumCorrect,
              total: analytics.mediumTotal,
              percentage: analytics.mediumTotal > 0 ? Math.round((analytics.mediumCorrect / analytics.mediumTotal) * 100) : 0,
            },
            hard: {
              correct: analytics.hardCorrect,
              total: analytics.hardTotal,
              percentage: analytics.hardTotal > 0 ? Math.round((analytics.hardCorrect / analytics.hardTotal) * 100) : 0,
            },
          },
          lastPracticed: analytics.lastPracticed,
          totalStudyTime: analytics.totalStudyTime,
        },
      });
    } catch (error) {
      console.error('Get subject analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subject analytics',
      });
    }
  }) as RequestHandler
);

/**
 * GET /analytics/trend
 * Get performance trend over time
 * Query params: period (7d, 30d, 90d, all)
 * Accessible by: All authenticated users
 */
router.get(
  '/trend',
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

      const { period = '30d' } = req.query;
      let daysBack = 30;

      switch (period) {
        case '7d':
          daysBack = 7;
          break;
        case '30d':
          daysBack = 30;
          break;
        case '90d':
          daysBack = 90;
          break;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const sessions = await prisma.practiceSession.findMany({
        where: {
          userId: req.userId,
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
          },
        },
        select: {
          completedAt: true,
          totalQuestions: true,
          correctAnswers: true,
        },
        orderBy: { completedAt: 'asc' },
      });

      // Group by date and calculate daily averages
      const trendData: any[] = [];
      const dateMap: { [key: string]: { correct: number; total: number; count: number } } = {};

      sessions.forEach((session) => {
        if (session.completedAt) {
          const dateKey = session.completedAt.toISOString().split('T')[0];
          if (!dateMap[dateKey]) {
            dateMap[dateKey] = { correct: 0, total: 0, count: 0 };
          }
          dateMap[dateKey].correct += session.correctAnswers;
          dateMap[dateKey].total += session.totalQuestions;
          dateMap[dateKey].count += 1;
        }
      });

      Object.entries(dateMap).forEach(([date, data]) => {
        trendData.push({
          date,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
          questionsAttempted: data.total,
          sessionsCount: data.count,
        });
      });

      res.json({
        success: true,
        data: {
          period,
          trend: trendData,
        },
      });
    } catch (error) {
      console.error('Get trend error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trend data',
      });
    }
  }) as RequestHandler
);

/**
 * GET /analytics/weak-areas
 * Get areas where user is struggling
 * Accessible by: All authenticated users
 */
router.get(
  '/weak-areas',
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

      const analytics = await prisma.performanceAnalytics.findMany({
        where: { userId: req.userId },
        include: { subject: true },
        orderBy: { accuracyRate: 'asc' },
        take: 5,
      });

      const weakAreas = analytics.map((a) => ({
        subjectId: a.subjectId,
        subjectName: a.subject.name,
        accuracy: Math.round(Number(a.accuracyRate)),
        totalAttempts: a.totalAttempts,
        recommendation: `Practice more ${a.subject.name} questions. Current accuracy is ${Math.round(Number(a.accuracyRate))}%.`,
      }));

      res.json({
        success: true,
        data: weakAreas,
      });
    } catch (error) {
      console.error('Get weak areas error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch weak areas',
      });
    }
  }) as RequestHandler
);

/**
 * GET /analytics/peers
 * ✅ FIXED - Get comparison with peers/average performance
 * Handles Decimal type conversion properly
 * Accessible by: All authenticated users
 */
router.get(
  '/peers',
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

      // Get current user's analytics
      const userAnalytics = await prisma.performanceAnalytics.findMany({
        where: { userId: req.userId },
      });

      // Calculate user's average accuracy - FIX: Convert Decimal to number
      const userAverageAccuracy =
        userAnalytics.length > 0
          ? Math.round(
              userAnalytics.reduce((sum, a) => sum + Number(a.accuracyRate), 0) / userAnalytics.length
            )
          : 0;

      // Get platform-wide analytics
      const allAnalytics = await prisma.performanceAnalytics.findMany({
        select: {
          accuracyRate: true,
          totalAttempts: true,
        },
      });

      // Calculate peer averages - FIX: Convert Decimal to number
      const peerAverageAccuracy =
        allAnalytics.length > 0
          ? Math.round(
              allAnalytics.reduce((sum, a) => sum + Number(a.accuracyRate), 0) / allAnalytics.length
            )
          : 0;

      const peerAverageAttempts =
        allAnalytics.length > 0
          ? Math.round(
              allAnalytics.reduce((sum, a) => sum + a.totalAttempts, 0) / allAnalytics.length
            )
          : 0;

      // Calculate percentile - FIX: Convert Decimal to number for comparison
      const userTotalAttempts = userAnalytics.reduce((sum, a) => sum + a.totalAttempts, 0);
      const usersBelowUser = allAnalytics.filter(
        (a) => Number(a.accuracyRate) < userAverageAccuracy
      ).length;
      const percentile = Math.round((usersBelowUser / Math.max(allAnalytics.length, 1)) * 100);

      res.json({
        success: true,
        data: {
          userStats: {
            accuracy: userAverageAccuracy,
            totalAttempts: userTotalAttempts,
            sessionsCount: userAnalytics.length,
          },
          peerStats: {
            averageAccuracy: peerAverageAccuracy,
            averageAttempts: peerAverageAttempts,
            totalUsers: allAnalytics.length,
          },
          comparison: {
            accuracyDifference: userAverageAccuracy - peerAverageAccuracy,
            performanceRating:
              userAverageAccuracy > peerAverageAccuracy ? 'above average' : 'below average',
            percentile: Math.min(percentile, 100),
          },
        },
      });
    } catch (error) {
      console.error('Get peers comparison error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch peer comparison data',
      });
    }
  }) as RequestHandler
);

/**
 * GET /analytics/time
 * Get time-based analytics (study patterns, time spent)
 * Query params: period (days, default 30)
 * Accessible by: Teachers and above
 */
router.get(
  '/time',
  authMiddleware,
  teacherMiddleware,
  (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const { period = '30' } = req.query;
      const days = parseInt(period as string, 10) || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sessions = await prisma.practiceSession.findMany({
        where: {
          userId: req.userId,
          status: 'COMPLETED',
          completedAt: { gte: startDate },
        },
        select: {
          timeSpent: true,
          completedAt: true,
          totalQuestions: true,
        },
      });

      const totalTimeSpent = sessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0);
      const averageSessionTime =
        sessions.length > 0 ? Math.round(totalTimeSpent / sessions.length / 60) : 0;

      res.json({
        success: true,
        data: {
          totalTimeSpent: Math.round(totalTimeSpent / 3600), // Convert to hours
          averageSessionTime, // in minutes
          sessionsCount: sessions.length,
          period: `${days} days`,
        },
      });
    } catch (error) {
      console.error('Get time analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch time analytics',
      });
    }
  }) as RequestHandler
);

export default router;