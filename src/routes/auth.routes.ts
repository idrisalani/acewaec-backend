import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { uploadProfilePicture } from '../middleware/upload.middleware'; // ADD THIS

const router = express.Router();
const prisma = new PrismaClient();

// Public routes - ADD upload middleware to register
router.post('/register', uploadProfilePicture.single('avatar'), AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// Protected route - Enhanced to include more fields
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true, // ADD THIS
        role: true,
        studentCategory: true, // ADD THIS
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true, // ADD THIS
        school: { // ADD THIS
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        createdAt: true,
        lastLogin: true,
      }
    });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

export default router;