import { PrismaClient, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

export interface AnalyticsUpdateResult {
  success: boolean;
  message: string;
  analyticsRecordsUpdated: number;
}

export interface RecommendationData {
  type: 'strength' | 'weakness' | 'practice' | 'mastery';
  priority: 'high' | 'medium' | 'low';
  message: string;
  subjectId: string;
  topicId?: string | null;
  action: string;
}

export interface DashboardStatsResult {
  overview: {
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: string;
    totalSessions: number;
    totalStudyTime: number;
    averageSessionScore: string;
    easyCorrect: number;
    easyTotal: number;
    mediumCorrect: number;
    mediumTotal: number;
    hardCorrect: number;
    hardTotal: number;
  };
  subjectBreakdown: Array<{
    name: string;
    totalQuestions: number;
    correct: number;
    accuracy: number;
  }>;
  recentSessions: Array<{
    id: string;
    date: Date | null;
    score: number;
    questions: number;
    correct: number;
  }>;
}

export class AnalyticsService {
  /**
   * Update performance analytics after session completion
   */
  static async updateAnalytics(
    sessionId: string,
    userId: string
  ): Promise<AnalyticsUpdateResult> {
    try {
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          practiceAnswers: {
            include: {
              question: {
                include: {
                  subject: true,
                  topic: true
                }
              }
            }
          }
        }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Group answers by subject and topic
      const groupedData = new Map<
        string,
        {
          subjectId: string;
          topicId: string | null;
          correct: number;
          wrong: number;
          easyCorrect: number;
          easyTotal: number;
          mediumCorrect: number;
          mediumTotal: number;
          hardCorrect: number;
          hardTotal: number;
          timeSpent: number;
        }
      >();

      for (const answer of session.practiceAnswers) {
        const key = `${answer.question.subjectId}-${answer.question.topicId || 'null'}`;

        if (!groupedData.has(key)) {
          groupedData.set(key, {
            subjectId: answer.question.subjectId,
            topicId: answer.question.topicId,
            correct: 0,
            wrong: 0,
            easyCorrect: 0,
            easyTotal: 0,
            mediumCorrect: 0,
            mediumTotal: 0,
            hardCorrect: 0,
            hardTotal: 0,
            timeSpent: answer.timeSpent || 0
          });
        }

        const data = groupedData.get(key)!;

        if (answer.isCorrect) {
          data.correct++;
        } else {
          data.wrong++;
        }

        // Track by difficulty
        const difficulty = answer.question.difficulty as DifficultyLevel;
        if (difficulty === 'EASY') {
          data.easyTotal++;
          if (answer.isCorrect) data.easyCorrect++;
        } else if (difficulty === 'MEDIUM') {
          data.mediumTotal++;
          if (answer.isCorrect) data.mediumCorrect++;
        } else if (difficulty === 'HARD') {
          data.hardTotal++;
          if (answer.isCorrect) data.hardCorrect++;
        }

        data.timeSpent += answer.timeSpent || 0;
      }

      // Update or create analytics records
      let recordsUpdated = 0;

      for (const [_, data] of groupedData) {
        const existing = await prisma.performanceAnalytics.findUnique({
          where: {
            userId_subjectId_topicId: {
              userId,
              subjectId: data.subjectId,
              topicId: data.topicId || undefined
            }
          }
        });

        const totalAttempts = data.correct + data.wrong;
        const accuracyRate = totalAttempts > 0
          ? (data.correct / totalAttempts) * 100
          : 0;

        if (existing) {
          await prisma.performanceAnalytics.update({
            where: { id: existing.id },
            data: {
              totalAttempts: existing.totalAttempts + totalAttempts,
              correctAnswers: existing.correctAnswers + data.correct,
              wrongAnswers: existing.wrongAnswers + data.wrong,
              accuracyRate: ((existing.correctAnswers + data.correct) /
                (existing.totalAttempts + totalAttempts)) * 100,
              easyCorrect: existing.easyCorrect + data.easyCorrect,
              easyTotal: existing.easyTotal + data.easyTotal,
              mediumCorrect: existing.mediumCorrect + data.mediumCorrect,
              mediumTotal: existing.mediumTotal + data.mediumTotal,
              hardCorrect: existing.hardCorrect + data.hardCorrect,
              hardTotal: existing.hardTotal + data.hardTotal,
              totalStudyTime: existing.totalStudyTime + data.timeSpent,
              lastPracticed: new Date(),
              averageTimePerQ: Math.floor(
                (existing.totalStudyTime + data.timeSpent) /
                (existing.totalAttempts + totalAttempts)
              )
            }
          });
        } else {
          await prisma.performanceAnalytics.create({
            data: {
              userId,
              subjectId: data.subjectId,
              topicId: data.topicId,
              totalAttempts,
              correctAnswers: data.correct,
              wrongAnswers: data.wrong,
              accuracyRate,
              easyCorrect: data.easyCorrect,
              easyTotal: data.easyTotal,
              mediumCorrect: data.mediumCorrect,
              mediumTotal: data.mediumTotal,
              hardCorrect: data.hardCorrect,
              hardTotal: data.hardTotal,
              totalStudyTime: data.timeSpent,
              lastPracticed: new Date(),
              averageTimePerQ: totalAttempts > 0
                ? Math.floor(data.timeSpent / totalAttempts)
                : 0
            }
          });
        }

        recordsUpdated++;
      }

      return {
        success: true,
        message: `Updated ${recordsUpdated} analytics records`,
        analyticsRecordsUpdated: recordsUpdated
      };
    } catch (error) {
      console.error('Error updating analytics:', error);
      throw new Error(`Failed to update analytics: ${error}`);
    }
  }

  /**
   * Generate personalized recommendations based on performance
   */
  static async generateRecommendations(userId: string): Promise<RecommendationData[]> {
    try {
      const analytics = await prisma.performanceAnalytics.findMany({
        where: { userId },
        include: {
          subject: true,
          topic: true
        }
      });

      const recommendations: RecommendationData[] = [];

      for (const data of analytics) {
        const accuracy = Number(data.accuracyRate);
        const totalQ = data.totalAttempts;

        // Identify weaknesses (< 50% accuracy with enough data)
        if (accuracy < 50 && totalQ >= 5) {
          recommendations.push({
            type: 'weakness',
            priority: 'high',
            message: `You're struggling with ${data.topic?.name || data.subject.name}. ${accuracy.toFixed(0)}% accuracy on ${totalQ} questions.`,
            subjectId: data.subjectId,
            topicId: data.topicId,
            action: `Practice more ${data.topic?.name || data.subject.name} questions`
          });
        }

        // Identify areas needing practice (50-70% accuracy)
        if (accuracy >= 50 && accuracy < 70 && totalQ >= 5) {
          recommendations.push({
            type: 'practice',
            priority: 'medium',
            message: `${data.topic?.name || data.subject.name} needs more work. ${accuracy.toFixed(0)}% accuracy.`,
            subjectId: data.subjectId,
            topicId: data.topicId,
            action: `Review concepts and practice 10-15 more questions`
          });
        }

        // Identify strengths (> 80% accuracy)
        if (accuracy >= 80 && totalQ >= 5) {
          recommendations.push({
            type: 'strength',
            priority: 'low',
            message: `Excellent work in ${data.topic?.name || data.subject.name}! ${accuracy.toFixed(0)}% accuracy.`,
            subjectId: data.subjectId,
            topicId: data.topicId,
            action: `Try harder difficulty questions to challenge yourself`
          });
        }

        // Mastery (> 90% accuracy with significant practice)
        if (accuracy >= 90 && totalQ >= 20) {
          recommendations.push({
            type: 'mastery',
            priority: 'low',
            message: `You've mastered ${data.topic?.name || data.subject.name}! ${accuracy.toFixed(0)}% on ${totalQ}+ questions.`,
            subjectId: data.subjectId,
            topicId: data.topicId,
            action: `Maintain with periodic review`
          });
        }

        // Not enough practice data
        if (totalQ < 5 && totalQ > 0) {
          recommendations.push({
            type: 'practice',
            priority: 'medium',
            message: `More practice needed in ${data.topic?.name || data.subject.name}. Only ${totalQ} questions attempted.`,
            subjectId: data.subjectId,
            topicId: data.topicId,
            action: `Complete at least 10 questions to get insights`
          });
        }
      }

      // Sort by priority
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      recommendations.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error(`Failed to generate recommendations: ${error}`);
    }
  }

  /**
   * Get comprehensive dashboard statistics for user
   */
  static async getDashboardStats(userId: string): Promise<DashboardStatsResult> {
    try {
      const sessions = await prisma.practiceSession.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        orderBy: { completedAt: 'desc' },
        take: 30
      });

      const analytics = await prisma.performanceAnalytics.findMany({
        where: { userId },
        include: { subject: true }
      });

      const totalQuestions = analytics.reduce((sum, a) => sum + a.totalAttempts, 0);
      const totalCorrect = analytics.reduce((sum, a) => sum + a.correctAnswers, 0);
      const overallAccuracy = totalQuestions > 0 
        ? (totalCorrect / totalQuestions) * 100 
        : 0;
      const totalStudyTime = analytics.reduce((sum, a) => sum + a.totalStudyTime, 0);

      // Calculate difficulty stats
      const difficultyStats = analytics.reduce(
        (acc, data) => ({
          easyCorrect: acc.easyCorrect + data.easyCorrect,
          easyTotal: acc.easyTotal + data.easyTotal,
          mediumCorrect: acc.mediumCorrect + data.mediumCorrect,
          mediumTotal: acc.mediumTotal + data.mediumTotal,
          hardCorrect: acc.hardCorrect + data.hardCorrect,
          hardTotal: acc.hardTotal + data.hardTotal
        }),
        {
          easyCorrect: 0,
          easyTotal: 0,
          mediumCorrect: 0,
          mediumTotal: 0,
          hardCorrect: 0,
          hardTotal: 0
        }
      );

      // Calculate subject stats
      const subjectStats: Record<
        string,
        { name: string; totalQuestions: number; correct: number; accuracy: number }
      > = {};

      analytics.forEach((data) => {
        if (!subjectStats[data.subjectId]) {
          subjectStats[data.subjectId] = {
            name: data.subject.name,
            totalQuestions: 0,
            correct: 0,
            accuracy: 0
          };
        }
        subjectStats[data.subjectId].totalQuestions += data.totalAttempts;
        subjectStats[data.subjectId].correct += data.correctAnswers;
        subjectStats[data.subjectId].accuracy =
          (subjectStats[data.subjectId].correct /
            subjectStats[data.subjectId].totalQuestions) *
          100;
      });

      const averageSessionScore =
        sessions.length > 0
          ? (
              sessions.reduce(
                (sum, s) => sum + Number(s.score || 0),
                0
              ) / sessions.length
            ).toFixed(1)
          : '0';

      return {
        overview: {
          totalQuestions,
          totalCorrect,
          overallAccuracy: overallAccuracy.toFixed(1),
          totalSessions: sessions.length,
          totalStudyTime: Math.floor(totalStudyTime / 60),
          averageSessionScore,
          ...difficultyStats
        },
        subjectBreakdown: Object.values(subjectStats),
        recentSessions: sessions.slice(0, 10).map((s) => ({
          id: s.id,
          date: s.completedAt,
          score: Number(s.score || 0),
          questions: s.totalQuestions,
          correct: s.correctAnswers
        }))
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error(`Failed to get dashboard stats: ${error}`);
    }
  }
}