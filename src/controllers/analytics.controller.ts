// backend/src/controllers/analytics.controller.ts
// ✅ FULLY CORRECTED - Decimal import fixed

import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index';
import { AnalyticsService } from '../services/analytics.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ✅ FIXED IMPORT: Get Decimal type from prisma client runtime
 * This is the correct way to import Decimal in modern Prisma versions
 */
let Decimal: any;
try {
  // Try modern Prisma (v5+)
  const runtime = require('@prisma/client/runtime/library');
  Decimal = runtime.Decimal;
} catch {
  try {
    // Fallback for older Prisma versions
    const runtime = require('@prisma/client/runtime');
    Decimal = runtime.Decimal;
  } catch {
    // Final fallback: just use any type and check value type
    Decimal = null;
  }
}

/**
 * Helper function: Convert Decimal to number
 * ✅ FIXED: Works even if Decimal import fails
 */
const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  
  // Check if it's a Decimal instance
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  
  // Otherwise convert to number
  return Number(value);
};

export class AnalyticsController {
  /**
   * ✅ EXISTING METHOD
   * GET /analytics/dashboard
   * Get user's dashboard analytics (overview of performance)
   */
  static async getDashboard(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const stats = await AnalyticsService.getDashboardStats(req.userId!);
      const recommendations = await AnalyticsService.generateRecommendations(req.userId!);

      res.json({
        success: true,
        data: {
          stats,
          recommendations
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get dashboard';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * ✅ EXISTING METHOD
   * GET /analytics/subjects/:subjectId
   * Get subject-specific analytics and performance
   */
  static async getSubjectAnalytics(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { subjectId } = req.params;

      const analytics = await prisma.performanceAnalytics.findMany({
        where: {
          userId: req.userId!,
          subjectId
        },
        include: {
          topic: true,
          subject: true
        }
      });

      res.json({ success: true, data: analytics });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get subject analytics';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * ✅ EXISTING METHOD
   * GET /analytics/trend
   * Get performance trend over time
   */
  static async getPerformanceTrend(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const sessions = await prisma.practiceSession.findMany({
        where: {
          userId: req.userId!,
          status: 'COMPLETED'
        },
        orderBy: { completedAt: 'asc' },
        take: 50,
        select: {
          id: true,
          completedAt: true,
          score: true,
          totalQuestions: true,
          correctAnswers: true
        }
      });

      res.json({ success: true, data: sessions });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get performance trend';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * ✅ EXISTING METHOD
   * GET /analytics/weak-areas
   * Get areas where user is struggling
   */
  static async getWeakAreas(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const weakAreas = await prisma.performanceAnalytics.findMany({
        where: {
          userId: req.userId!,
          accuracyRate: { lt: 50 },
          totalAttempts: { gte: 5 }
        },
        include: {
          topic: true,
          subject: true
        },
        orderBy: {
          accuracyRate: 'asc'
        },
        take: 10
      });

      res.json({ success: true, data: weakAreas });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get weak areas';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * ✅ CORRECTED METHOD
   * GET /analytics/comparison
   * Get comparison with peers/average performance
   */
  static async getComparison(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      // Get user's average performance
      const userStats = await prisma.performanceAnalytics.aggregate({
        where: { userId: req.userId! },
        _avg: { accuracyRate: true },
        _count: true
      });

      // Get class/peer average (all users in same role)
      const peerStats = await prisma.performanceAnalytics.aggregate({
        _avg: { accuracyRate: true },
        _count: true
      });

      // Get user's ranking
      const userRank = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: {
          id: true,
          email: true
        }
      });

      // Safe null checks and Decimal conversion
      const userAccuracy = toNumber(userStats._avg?.accuracyRate);
      const peerAccuracy = toNumber(peerStats._avg?.accuracyRate);

      res.json({
        success: true,
        data: {
          yourPerformance: {
            averageAccuracy: userAccuracy,
            totalRecords: userStats._count
          },
          peerAverage: {
            averageAccuracy: peerAccuracy,
            totalRecords: peerStats._count
          },
          percentile: peerAccuracy > 0 
            ? parseFloat(((userAccuracy / peerAccuracy) * 100).toFixed(2))
            : 0,
          userRank
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get comparison';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * ✅ CORRECTED METHOD
   * GET /analytics/time
   * Get time-based analytics (study patterns, time spent)
   */
  static async getTimeAnalytics(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { period = '30' } = req.query;
      const daysBack = parseInt(period as string) || 30;
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysBack);

      // Get total study time
      const sessions = await prisma.practiceSession.findMany({
        where: {
          userId: req.userId!,
          createdAt: { gte: dateFrom }
        },
        select: {
          duration: true,
          completedAt: true,
          createdAt: true,
          score: true
        }
      });

      // Convert Decimal to number for arithmetic
      const totalStudyTime = sessions.reduce((sum, s) => {
        const duration = toNumber(s.duration);
        return sum + duration;
      }, 0);

      const avgSessionDuration = sessions.length > 0 ? totalStudyTime / sessions.length : 0;

      // Convert Decimal to number for score averaging
      const averageScore = sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + toNumber(s.score), 0) / sessions.length 
        : 0;

      // Get hourly distribution (for peak study hours)
      const hourlyStats = new Array(24).fill(0);
      sessions.forEach(s => {
        if (s.completedAt) {
          const hour = new Date(s.completedAt).getHours();
          hourlyStats[hour]++;
        }
      });

      const peakHours = hourlyStats
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      res.json({
        success: true,
        data: {
          period: `${daysBack} days`,
          totalStudyTime: `${(totalStudyTime / 60).toFixed(2)} hours`,
          averageSessionDuration: `${avgSessionDuration.toFixed(2)} minutes`,
          averageScore: averageScore.toFixed(2),
          totalSessions: sessions.length,
          peakHours: peakHours.map(p => `${p.hour}:00 (${p.count} sessions)`),
          consistency: ((sessions.length / daysBack) * 100).toFixed(2) + '%'
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get time analytics';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * ✅ CORRECTED METHOD
   * GET /analytics/progress-report
   * Get comprehensive progress report
   */
  static async getProgressReport(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { format = 'json' } = req.query;

      // Validate format
      if (!['json', 'pdf', 'csv'].includes(format as string)) {
        res.status(400).json({ success: false, error: 'Invalid format. Allowed: json, pdf, csv' });
        return;
      }

      // Get comprehensive data
      const [userInfo, performanceData, sessions, weakAreas, achievementStats] = await Promise.all([
        prisma.user.findUnique({
          where: { id: req.userId! },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true
          }
        }),
        prisma.performanceAnalytics.findMany({
          where: { userId: req.userId! },
          include: { subject: true, topic: true }
        }),
        prisma.practiceSession.findMany({
          where: { userId: req.userId!, status: 'COMPLETED' },
          select: { score: true, totalQuestions: true, correctAnswers: true, completedAt: true }
        }),
        prisma.performanceAnalytics.findMany({
          where: { userId: req.userId!, accuracyRate: { lt: 60 } },
          include: { topic: true },
          take: 5
        }),
        prisma.performanceAnalytics.aggregate({
          where: { userId: req.userId! },
          _avg: { accuracyRate: true },
          _max: { accuracyRate: true },
          _min: { accuracyRate: true }
        })
      ]);

      // Convert Decimal to number for all calculations
      const sessionScores = sessions.map(s => toNumber(s.score));
      const averageScore = sessionScores.length > 0 
        ? (sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length).toFixed(2)
        : 0;

      const overallAccuracy = toNumber(achievementStats._avg?.accuracyRate);
      const bestPerformance = toNumber(achievementStats._max?.accuracyRate);
      const worstPerformance = toNumber(achievementStats._min?.accuracyRate);

      const reportData = {
        generatedAt: new Date().toISOString(),
        user: userInfo,
        summary: {
          totalTopicsStudied: performanceData.length,
          totalSessions: sessions.length,
          averageScore,
          overallAccuracy: overallAccuracy.toFixed(2),
          bestPerformance: bestPerformance.toFixed(2),
          worstPerformance: worstPerformance.toFixed(2)
        },
        performanceBySubject: performanceData.reduce((acc: any, p: any) => {
          const subject = p.subject?.name || 'Unknown';
          if (!acc[subject]) {
            acc[subject] = { accuracy: [], attempts: 0 };
          }
          acc[subject].accuracy.push(toNumber(p.accuracyRate));
          acc[subject].attempts += p.totalAttempts;
          return acc;
        }, {}),
        areasForImprovement: weakAreas.map(a => ({
          topic: a.topic?.name,
          subject: a.topic?.subjectId,
          currentAccuracy: toNumber(a.accuracyRate).toFixed(2),
          totalAttempts: a.totalAttempts
        })),
        recentProgress: sessions.slice(-10).map(s => ({
          score: toNumber(s.score),
          accuracy: ((toNumber(s.correctAnswers) / toNumber(s.totalQuestions)) * 100).toFixed(2) + '%',
          date: s.completedAt
        }))
      };

      // Format response based on requested format
      if (format === 'json') {
        res.json({ success: true, data: reportData });
      } else if (format === 'csv') {
        // TODO: Implement CSV export
        res.json({ 
          success: true, 
          message: 'CSV export coming soon',
          data: reportData 
        });
      } else if (format === 'pdf') {
        // TODO: Implement PDF export
        res.json({ 
          success: true, 
          message: 'PDF export coming soon',
          data: reportData 
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get progress report';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * ✅ CORRECTED METHOD
   * GET /analytics/goals
   * Get user's learning goals and progress
   */
  static async getGoals(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const performanceData = await prisma.performanceAnalytics.findMany({
        where: { userId: req.userId! },
        include: { subject: true, topic: true }
      });

      // Convert Decimal to number for comparisons
      const weakTopics = performanceData
        .filter(p => toNumber(p.accuracyRate) < 70)
        .sort((a, b) => toNumber(a.accuracyRate) - toNumber(b.accuracyRate))
        .slice(0, 5);

      // Get strong areas for positive reinforcement
      const strongTopics = performanceData
        .filter(p => toNumber(p.accuracyRate) >= 80)
        .slice(0, 3);

      // Convert Decimal to number in goal calculations
      const goals = weakTopics.map((topic, index) => {
        const accuracy = toNumber(topic.accuracyRate);
        return {
          id: `goal-${index}`,
          title: `Improve ${topic.topic?.name || 'Unknown Topic'}`,
          description: `Current accuracy: ${accuracy.toFixed(2)}%. Target: 80%`,
          currentAccuracy: accuracy,
          targetAccuracy: 80,
          status: accuracy >= 80 ? 'COMPLETED' : 'IN_PROGRESS',
          progress: (accuracy / 80) * 100,
          subject: topic.subject?.name,
          createdAt: new Date(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
      });

      // Add maintenance goals for strong areas
      const maintenanceGoals = strongTopics.map((topic, index) => {
        const accuracy = toNumber(topic.accuracyRate);
        return {
          id: `maintenance-goal-${index}`,
          title: `Maintain excellence in ${topic.topic?.name || 'Unknown Topic'}`,
          description: `Current accuracy: ${accuracy.toFixed(2)}%. Maintain above 80%`,
          currentAccuracy: accuracy,
          targetAccuracy: 80,
          status: 'IN_PROGRESS' as const,
          progress: (accuracy / 100) * 100,
          subject: topic.subject?.name,
          createdAt: new Date(),
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        };
      });

      const completedGoals = goals.filter(g => g.status === 'COMPLETED');
      const inProgressGoals = goals.filter(g => g.status === 'IN_PROGRESS');
      const inProgressMaintenance = maintenanceGoals.filter(g => g.status === 'IN_PROGRESS');

      res.json({
        success: true,
        data: {
          improvementGoals: goals,
          maintenanceGoals: maintenanceGoals,
          completedGoals,
          summary: {
            totalGoals: goals.length + maintenanceGoals.length,
            inProgress: inProgressGoals.length + inProgressMaintenance.length,
            completed: completedGoals.length
          }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get goals';
      res.status(500).json({ success: false, error: message });
    }
  }
}

export default AnalyticsController;