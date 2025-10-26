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

      // // Get avatar path if uploaded - THIS HANDLES THE FILE
      // const avatar = req.file ? `/uploads/profiles/${req.file.filename}` : null;

      const avatar = req.file
        ? req.file.path || `/uploads/profiles/${req.file.filename}`
        : null;

      // When using CLOUDINARY (for production/Vercel):
      // The CloudinaryStorage middleware automatically stores the URL in req.file.path
      // const avatar = req.file ? req.file.path : null;  // ✅ Cloudinary URL

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
          studentCategory: true, // ✅ INCLUDE CATEGORY
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

      console.log('✅ Registration successful for:', user.email);
      console.log('✅ Registered with category:', user.studentCategory); // ✅ DEBUG

      res.status(201).json({
        success: true,
        data: {
          user, // ✅ User includes studentCategory
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }

    console.log('📸 Avatar URL saved:', {
      filename: req.file?.filename,
      path: req.file?.path,
      destination: req.file?.destination,
      finalUrl: avatar,
      isCloudinary: avatar?.includes('cloudinary')
    });
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

      // ✅ UPDATED: Use select instead of include to ensure consistent field return
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          password: true, // Needed for bcrypt comparison
          role: true,
          avatar: true,
          studentCategory: true, // ✅ INCLUDE CATEGORY
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          createdAt: true,
          lastLogin: true,
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
        console.log('❌ User not found:', normalizedEmail);
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      console.log('✅ User found, checking password...');
      console.log('📋 User category:', user.studentCategory); // ✅ DEBUG: Log category

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

      // ✅ UPDATED: Return user without password (but keep all other fields including studentCategory)
      const { password: _, ...userWithoutPassword } = user;

      console.log('✅ Login successful for:', user.email);
      console.log('✅ Returning studentCategory:', userWithoutPassword.studentCategory); // ✅ DEBUG

      res.json({
        success: true,
        data: {
          user: userWithoutPassword, // ✅ Includes studentCategory
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

      // ✅ UPDATED: Use select to ensure studentCategory is included
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          avatar: true,
          studentCategory: true, // ✅ INCLUDE CATEGORY
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          createdAt: true,
          lastLogin: true,
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

      console.log('✅ getCurrentUser - Returning category:', user.studentCategory); // ✅ DEBUG

      res.json({ success: true, data: user }); // ✅ User includes studentCategory
    } catch (error) {
      console.error('getCurrentUser error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  }
}