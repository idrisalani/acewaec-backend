// @ts-nocheck
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole, StudentCategory } from '@prisma/client';

const prisma = new PrismaClient();

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, phone, studentCategory } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(400).json({ success: false, error: 'Email already registered' });
        return;
      }

      // Validate student category if provided
      if (studentCategory && !Object.values(StudentCategory).includes(studentCategory)) {
        res.status(400).json({
          success: false,
          error: 'Invalid student category. Must be SCIENCE, ART, or COMMERCIAL'
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Get avatar path if uploaded - THIS HANDLES THE FILE
      const avatar = req.file ? `/uploads/profiles/${req.file.filename}` : null;

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone: phone || null,
          avatar, // Save avatar path
          role: UserRole.STUDENT,
          studentCategory: studentCategory as StudentCategory || null,
          lastLogin: new Date(),
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          avatar: true,
          studentCategory: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'acewaec-super-secret-jwt-key-2024',
        { expiresIn: '1d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'acewaec-super-secret-jwt-key-2024',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      console.log('🔐 Login attempt for:', email);

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { school: true },
      });

      if (!user) {
        console.log('❌ User not found:', normalizedEmail);
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      console.log('✅ User found, checking password...');

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        console.log('❌ Invalid password');
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      console.log('✅ Password valid, generating tokens...');

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // CRITICAL FIX: Use correct fallback secret
      const secret = process.env.JWT_SECRET || 'acewaec-super-secret-jwt-key-2024';
      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'acewaec-refresh-secret-key-2024';

      console.log('🔑 Using JWT_SECRET:', secret.substring(0, 15) + '...');

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        secret,  // ✅ Use the variable
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        refreshSecret,  // ✅ Use the variable
        { expiresIn: '30d' }
      );

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      console.log('✅ Login successful for:', user.email);

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.'
      });
    }
  }

  static async logout(req: Request, res: Response) {
    res.json({ success: true, message: 'Logged out successfully' });
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          school: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // Remove password before sending
      const { password, ...userWithoutPassword } = user;

      res.json({ success: true, data: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  }
}