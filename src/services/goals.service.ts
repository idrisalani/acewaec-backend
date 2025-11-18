// backend/src/services/goals.service.ts
// Service for managing user goals and study streaks

import { Goal, Streak, GoalType, GoalStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GoalsService {
  /**
   * Create a new goal for a user
   */
  async createGoal(
    userId: string,
    data: {
      title: string;
      description?: string;
      type: GoalType;
      targetValue: number;
      dueDate: Date;
    }
  ): Promise<Goal> {
    return prisma.goal.create({
      data: {
        userId,
        ...data,
        status: GoalStatus.ACTIVE,
      },
    });
  }

  /**
   * Get all active goals for a user
   */
  async getUserGoals(userId: string, status?: GoalStatus): Promise<Goal[]> {
    return prisma.goal.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get a specific goal by ID
   */
  async getGoalById(goalId: string): Promise<Goal | null> {
    return prisma.goal.findUnique({
      where: { id: goalId },
    });
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    goalId: string,
    increment: number
  ): Promise<Goal | null> {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) return null;

    const newProgress = goal.currentValue + increment;
    const isCompleted = newProgress >= goal.targetValue;

    return prisma.goal.update({
      where: { id: goalId },
      data: {
        currentValue: newProgress,
        status: isCompleted ? GoalStatus.COMPLETED : goal.status,
        completedAt: isCompleted ? new Date() : goal.completedAt,
      },
    });
  }

  /**
   * Complete a goal manually
   */
  async completeGoal(goalId: string): Promise<Goal | null> {
    return prisma.goal.update({
      where: { id: goalId },
      data: {
        status: GoalStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Pause a goal
   */
  async pauseGoal(goalId: string): Promise<Goal | null> {
    return prisma.goal.update({
      where: { id: goalId },
      data: { status: GoalStatus.PAUSED },
    });
  }

  /**
   * Resume a paused goal
   */
  async resumeGoal(goalId: string): Promise<Goal | null> {
    return prisma.goal.update({
      where: { id: goalId },
      data: { status: GoalStatus.ACTIVE },
    });
  }

  /**
   * Abandon a goal
   */
  async abandonGoal(goalId: string): Promise<Goal | null> {
    return prisma.goal.update({
      where: { id: goalId },
      data: { status: GoalStatus.ABANDONED },
    });
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<boolean> {
    try {
      await prisma.goal.delete({
        where: { id: goalId },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get goal progress percentage
   */
  async getGoalProgress(goalId: string): Promise<number | null> {
    const goal = await this.getGoalById(goalId);
    if (!goal) return null;
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  }

  /**
   * Get all goals summary for a user
   */
  async getGoalsSummary(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId },
    });

    const summary = {
      total: goals.length,
      active: goals.filter((g) => g.status === GoalStatus.ACTIVE).length,
      completed: goals.filter((g) => g.status === GoalStatus.COMPLETED).length,
      paused: goals.filter((g) => g.status === GoalStatus.PAUSED).length,
      abandoned: goals.filter((g) => g.status === GoalStatus.ABANDONED).length,
      completionRate: goals.length
        ? Math.round(
            (goals.filter((g) => g.status === GoalStatus.COMPLETED).length /
              goals.length) *
              100
          )
        : 0,
    };

    return summary;
  }
}

export class StreaksService {
  /**
   * Initialize streak for a new user
   */
  async initializeStreak(userId: string): Promise<Streak> {
    return prisma.streak.create({
      data: {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
      },
    });
  }

  /**
   * Get streak for a user
   */
  async getUserStreak(userId: string): Promise<Streak | null> {
    return prisma.streak.findUnique({
      where: { userId },
    });
  }

  /**
   * Update streak based on user activity
   */
  async updateStreak(userId: string): Promise<Streak | null> {
    let streak = await this.getUserStreak(userId);

    if (!streak) {
      streak = await this.initializeStreak(userId);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = new Date(streak.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const daysDifference = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    let newCurrentStreak = streak.currentStreak;
    let newTotalDaysActive = streak.totalDaysActive;
    let newLongestStreak = streak.longestStreak;

    if (daysDifference === 0) {
      // Same day - no change needed
      return streak;
    } else if (daysDifference === 1) {
      // Consecutive day
      newCurrentStreak = streak.currentStreak + 1;
      newTotalDaysActive = streak.totalDaysActive + 1;
      newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak);
    } else {
      // Streak broken
      newCurrentStreak = 1;
      newTotalDaysActive = streak.totalDaysActive + 1;
    }

    return prisma.streak.update({
      where: { userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        totalDaysActive: newTotalDaysActive,
        lastActiveDate: new Date(),
      },
    });
  }

  /**
   * Reset streak (for when user hasn't been active)
   */
  async resetStreak(userId: string): Promise<Streak | null> {
    return prisma.streak.update({
      where: { userId },
      data: {
        currentStreak: 0,
      },
    });
  }

  /**
   * Get streak statistics
   */
  async getStreakStats(userId: string) {
    const streak = await this.getUserStreak(userId);

    if (!streak) {
      return {
        hasStreak: false,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
      };
    }

    return {
      hasStreak: streak.currentStreak > 0,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDaysActive: streak.totalDaysActive,
      motivationalMessage: this.getMotivationalMessage(streak.currentStreak),
    };
  }

  /**
   * Get motivational message based on streak
   */
  private getMotivationalMessage(currentStreak: number): string {
    if (currentStreak === 0) return "Start your first streak today!";
    if (currentStreak === 1) return "Great start! Keep it going! 🔥";
    if (currentStreak < 7) return `${currentStreak} days in a row! You're on fire! 🔥`;
    if (currentStreak < 30) return `Amazing! ${currentStreak} day streak! 🌟`;
    if (currentStreak < 100) return `Outstanding! ${currentStreak} day streak! You're a champion! 👑`;
    return `Legendary! ${currentStreak} day streak! You're unstoppable! 🚀`;
  }

  /**
   * Check if streak should be broken (no activity for more than 1 day)
   */
  async checkAndResetExpiredStreaks(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    await prisma.streak.updateMany({
      where: {
        lastActiveDate: {
          lt: yesterday,
        },
        currentStreak: {
          gt: 0,
        },
      },
      data: {
        currentStreak: 0,
      },
    });
  }

  /**
   * Get top streaks for leaderboard
   */
  async getTopStreaks(limit: number = 10) {
    return prisma.streak.findMany({
      orderBy: [{ currentStreak: 'desc' }, { longestStreak: 'desc' }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}

export default {
  GoalsService,
  StreaksService,
};