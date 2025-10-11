import { Response } from 'express';
import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class AdminController {
  // Dashboard Stats - Comprehensive Overview
  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const [
        // User Stats
        totalUsers,
        pendingUsers,
        activeUsers,
        suspendedUsers,

        // Question Stats
        totalQuestions,
        activeQuestions,
        pendingQuestions,
        questionsByDifficulty,

        // School Stats
        totalSchools,
        activeSchools,

        // Subscription Stats
        activeSubscriptions,
        premiumUsers,

        // Practice Stats
        totalSessions,
        activeSessions,
        completedToday
      ] = await Promise.all([
        // Users
        prisma.user.count(),
        prisma.user.count({ where: { accountStatus: AccountStatus.PENDING } }),
        prisma.user.count({ where: { accountStatus: AccountStatus.ACTIVE } }),
        prisma.user.count({ where: { accountStatus: AccountStatus.SUSPENDED } }),

        // Questions
        prisma.question.count(),
        prisma.question.count({ where: { isActive: true } }),
        prisma.question.count({ where: { isActive: false } }),
        prisma.question.groupBy({
          by: ['difficulty'],
          _count: true
        }),

        // Schools
        prisma.school.count(),
        prisma.school.count({ where: { isActive: true } }),

        // Subscriptions
        prisma.user.count({ where: { subscriptionStatus: 'ACTIVE' } }),
        prisma.user.count({ where: { subscriptionTier: 'PREMIUM_MONTHLY' } }),

        // Practice Sessions
        prisma.practiceSession.count(),
        prisma.practiceSession.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.practiceSession.count({
          where: {
            completedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            pending: pendingUsers,
            active: activeUsers,
            suspended: suspendedUsers
          },
          questions: {
            total: totalQuestions,
            active: activeQuestions,
            pending: pendingQuestions,
            byDifficulty: questionsByDifficulty
          },
          schools: {
            total: totalSchools,
            active: activeSchools
          },
          subscriptions: {
            active: activeSubscriptions,
            premium: premiumUsers
          },
          sessions: {
            total: totalSessions,
            active: activeSessions,
            completedToday
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Get dashboard stats error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==================== USER MANAGEMENT ====================

  static async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const { status, role, search, page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.accountStatus = status;
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            role: true,
            studentCategory: true,
            accountStatus: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
            createdAt: true,
            lastLogin: true,
            school: {
              select: {
                id: true,
                name: true
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Get users error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getUserDetails(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          school: true,
          practiceSessions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              score: true,
              totalQuestions: true,
              correctAnswers: true,
              status: true,
              createdAt: true,
              completedAt: true
            }
          },
          _count: {
            select: {
              practiceSessions: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Remove password
      const { password, ...userWithoutPassword } = user;

      res.json({ success: true, data: userWithoutPassword });
    } catch (error: any) {
      console.error('❌ Get user details error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async approveUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.ACTIVE },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          accountStatus: true
        }
      });

      console.log(`✅ Admin approved user: ${user.email}`);

      res.json({
        success: true,
        data: user,
        message: 'User approved successfully'
      });
    } catch (error: any) {
      console.error('❌ Approve user error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async rejectUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.REJECTED }
      });

      console.log(`❌ Admin rejected user: ${user.email}. Reason: ${reason || 'Not specified'}`);

      res.json({
        success: true,
        data: user,
        message: 'User rejected'
      });
    } catch (error: any) {
      console.error('❌ Reject user error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async suspendUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.SUSPENDED }
      });

      console.log(`⚠️ Admin suspended user: ${user.email}. Reason: ${reason}`);

      res.json({
        success: true,
        data: user,
        message: 'User suspended'
      });
    } catch (error: any) {
      console.error('❌ Suspend user error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async activateUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.ACTIVE }
      });

      console.log(`✅ Admin activated user: ${user.email}`);

      res.json({
        success: true,
        data: user,
        message: 'User activated'
      });
    } catch (error: any) {
      console.error('❌ Activate user error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      // Delete related data using correct relation name
      await prisma.practiceAnswer.deleteMany({
        where: {
          session: {
            userId
          }
        }
      });

      await prisma.practiceSession.deleteMany({
        where: { userId }
      });

      await prisma.user.delete({
        where: { id: userId }
      });

      console.log(`🗑️ Admin deleted user: ${userId}`);
      res.json({
        success: true,
        message: 'User deleted permanently'
      });
    } catch (error: any) {
      console.error('❌ Delete user error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== SCHOOL MANAGEMENT ====================

  static async getAllSchools(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [schools, total] = await Promise.all([
        prisma.school.findMany({
          include: {
            _count: {
              select: { users: true }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.school.count()
      ]);

      res.json({
        success: true,
        data: {
          schools,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Get schools error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async approveSchool(req: AuthRequest, res: Response) {
    try {
      const { schoolId } = req.params;

      const school = await prisma.school.update({
        where: { id: schoolId },
        data: { isActive: true }
      });

      console.log(`✅ Admin approved school: ${school.name}`);

      res.json({
        success: true,
        data: school,
        message: 'School approved'
      });
    } catch (error: any) {
      console.error('❌ Approve school error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}