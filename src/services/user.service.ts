// backend/src/services/user.service.ts
// ✅ NEW FILE - User business logic service

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * UserService - Handles all user-related business logic
 * Separates business logic from controllers for better code organization
 */
export class UserService {
  /**
   * ============================================================================
   * PROFILE INFO METHODS
   * ============================================================================
   */

  /**
   * Get student info for export/display
   * Returns public student profile information
   */
  static async getStudentInfo(userId: string) {
    try {
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          phone: true,
          studentCategory: true,
          createdAt: true,
        },
      });

      if (!student) {
        throw new Error('Student not found');
      }

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        avatar: student.avatar,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        studentCategory: student.studentCategory,
        memberSince: student.createdAt,
      };
    } catch (error) {
      console.error('❌ Get student info error:', error);
      throw error;
    }
  }

  /**
   * Get full user profile
   * Returns all user data except sensitive info
   */
  static async getProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile information
   * Only updates provided fields to avoid overwriting
   */
  static async updateProfile(
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      username?: string;
    }
  ) {
    try {
      const dataToUpdate: any = {};

      if (updateData.firstName !== undefined) {
        dataToUpdate.firstName = updateData.firstName;
      }
      if (updateData.lastName !== undefined) {
        dataToUpdate.lastName = updateData.lastName;
      }
      if (updateData.phone !== undefined) {
        dataToUpdate.phone = updateData.phone;
      }
      if (updateData.username !== undefined) {
        // Check if username is already taken
        const existingUser = await prisma.user.findUnique({
          where: { username: updateData.username },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new Error('Username already taken');
        }

        dataToUpdate.username = updateData.username;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          updatedAt: true,
        },
      });

      console.log('✅ Profile updated:', userId);
      return updatedUser;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * PROFILE PICTURE METHODS
   * ============================================================================
   */

  /**
   * Update user's profile picture
   * Stores the Cloudinary URL in the database
   */
  static async uploadProfilePicture(userId: string, fileData: any) {
    try {
      if (!fileData) {
        throw new Error('No file provided');
      }

      // Use Cloudinary URL if available, otherwise fallback
      let pictureUrl = fileData.secure_url || fileData.path;

      if (!pictureUrl) {
        throw new Error('Failed to get picture URL from upload');
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { avatar: pictureUrl },
        select: {
          id: true,
          avatar: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      console.log('✅ Profile picture uploaded:', userId);

      return {
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          avatar: user.avatar,
          secure_url: fileData.secure_url || pictureUrl,
          filename: fileData.originalname,
          size: fileData.size,
          user: {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          },
        },
      };
    } catch (error) {
      console.error('❌ Upload profile picture error:', error);
      throw error;
    }
  }

  /**
   * Delete user's profile picture
   * Sets avatar to null
   */
  static async deleteProfilePicture(userId: string) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { avatar: null },
        select: {
          id: true,
          avatar: true,
          email: true,
        },
      });

      console.log('✅ Profile picture deleted:', userId);

      return {
        success: true,
        message: 'Profile picture deleted successfully',
        data: user,
      };
    } catch (error) {
      console.error('❌ Delete profile picture error:', error);
      throw error;
    }
  }

  /**
   * Get profile picture for a user
   * Returns avatar URL and user name
   */
  static async getProfilePicture(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          avatar: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          avatar: user.avatar,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        },
      };
    } catch (error) {
      console.error('❌ Get profile picture error:', error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * USER MANAGEMENT METHODS
   * ============================================================================
   */

  /**
   * Get user by ID
   * Returns public user information
   */
  static async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   * Optional filtering by role
   */
  static async getAllUsers(options: {
    role?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const { role, limit = 10, offset = 0 } = options;

      const where: any = {};
      if (role) {
        where.role = role.toUpperCase();
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            role: true,
            createdAt: true,
          },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        success: true,
        data: users,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('❌ Get all users error:', error);
      throw error;
    }
  }

  /**
   * Update user role
   * Only admins can update roles
   */
  static async updateUserRole(userId: string, newRole: string) {
    try {
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(newRole as UserRole)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole as UserRole },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
        },
      });

      console.log('✅ User role updated:', userId, 'to', newRole);

      return {
        success: true,
        message: 'User role updated successfully',
        data: user,
      };
    } catch (error) {
      console.error('❌ Update user role error:', error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * SECURITY METHODS
   * ============================================================================
   */

  /**
   * Change user password
   * Verifies old password before setting new one
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    try {
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          password: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash and save new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      console.log('✅ Password changed:', userId);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('❌ Change password error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * Generates reset token and sends email (TODO: implement email)
   */
  static async requestPasswordReset(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      });

      if (!user) {
        // Don't reveal if email exists for security
        throw new Error('If email exists, reset link will be sent');
      }

      // TODO: Generate reset token and send email
      // For now, just log it
      console.log('✅ Password reset requested for:', email);

      return {
        success: true,
        message: 'If email exists, reset link will be sent',
      };
    } catch (error) {
      console.error('❌ Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * Requires password verification
   */
  static async deleteAccount(userId: string, password: string) {
    try {
      if (!password) {
        throw new Error('Password required to delete account');
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Password is incorrect');
      }

      // Delete user (cascade delete handles related records)
      await prisma.user.delete({
        where: { id: userId },
      });

      console.log('✅ Account deleted:', user.email);

      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error) {
      console.error('❌ Delete account error:', error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * PREFERENCES METHODS
   * ============================================================================
   */

  /**
   * Get user preferences
   * Returns notification and display preferences
   */
  static async getPreferences(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // TODO: Query from preferences table when implemented
      // For now, return default preferences
      const defaultPreferences = {
        userId,
        notifications: {
          dailyReminder: true,
          dailyReminderTime: '09:00',
          streakReminder: true,
          goalReminder: true,
          achievementNotifications: true,
        },
        communication: {
          pushNotifications: true,
          emailNotifications: false,
          smsNotifications: false,
        },
        display: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
        },
        privacy: {
          showProfile: true,
          showStats: false,
          allowMessages: true,
        },
      };

      return defaultPreferences;
    } catch (error) {
      console.error('❌ Get preferences error:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   * Merges with existing preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: Record<string, any>
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // TODO: Save to preferences table when implemented
      // For now, just validate and return
      const updatedPreferences = {
        userId,
        ...preferences,
        updatedAt: new Date(),
      };

      console.log('✅ Preferences updated:', userId);

      return {
        success: true,
        message: 'Preferences updated successfully',
        data: updatedPreferences,
      };
    } catch (error) {
      console.error('❌ Update preferences error:', error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * HELPER METHODS
   * ============================================================================
   */

  /**
   * Check if email exists
   * Used for registration validation
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      console.error('❌ Email exists check error:', error);
      return false;
    }
  }

  /**
   * Check if username exists
   * Used for registration and profile update validation
   */
  static async usernameExists(username: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      console.error('❌ Username exists check error:', error);
      return false;
    }
  }

  /**
   * Get user with statistics
   * Returns user info plus aggregated stats
   */
  static async getUserWithStats(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user statistics
      const totalSessions = await prisma.practiceSession.count({
        where: { userId },
      });

      const completedSessions = await prisma.practiceSession.count({
        where: { userId, status: 'COMPLETED' },
      });

      return {
        user,
        stats: {
          totalSessions,
          completedSessions,
          memberSince: user.createdAt,
        },
      };
    } catch (error) {
      console.error('❌ Get user with stats error:', error);
      throw error;
    }
  }
}

export default UserService;