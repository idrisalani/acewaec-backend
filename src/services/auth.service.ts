import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';
  private static readonly SALT_ROUNDS = 12;

  private static generateTokens(userId: string, role: UserRole) {
    const accessToken = jwt.sign(
      { userId, role, type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId, role, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }

  static async register(data: RegisterData) {
    const { email, password, firstName, lastName, role = 'STUDENT' } = data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: role as UserRole,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
      }
    });

    const tokens = this.generateTokens(user.id, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return { user, tokens };
  }

  static async login(credentials: LoginCredentials) {
    const { email, password } = credentials;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
      }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const tokens = this.generateTokens(user.id, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  }
}