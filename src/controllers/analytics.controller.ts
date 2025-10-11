import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsController {
  static async getDashboard(req: AuthRequest, res: Response) {
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

  static async getSubjectAnalytics(req: AuthRequest, res: Response) {
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

  static async getPerformanceTrend(req: AuthRequest, res: Response) {
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

  static async getWeakAreas(req: AuthRequest, res: Response) {
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
}