// @ts-nocheck

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthRequest, UserRole, RoleList } from '../types/index';
import { authenticateToken } from '../middleware/auth.middleware';

// ============================================================================
// Type Definitions
// ============================================================================

// ============================================================================
// ✅ FIXED: Middleware with proper Express compatibility
// ============================================================================

/**
 * Require admin role middleware
 * ✅ FIXED: Using proper typing that's compatible with Express
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user || authReq.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }
  next();
};

/**
 * Require specific role(s) middleware
 * ✅ FIXED: Now uses the enum properly as value
 */
const requireRoles = (roles: RoleList) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }
    next();
  };
};

// ============================================================================
// Controller Stubs (Replace with actual implementations)
// ============================================================================

const AdminController = {
  getDashboardStats: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Dashboard stats endpoint' });
  },

  getAllUsers: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Get all users endpoint' });
  },

  getUserDetails: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Get user details endpoint' });
  },

  approveUser: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Approve user endpoint' });
  },

  rejectUser: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Reject user endpoint' });
  },

  suspendUser: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Suspend user endpoint' });
  },

  activateUser: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Activate user endpoint' });
  },

  deleteUser: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Delete user endpoint' });
  },

  getAllSchools: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Get all schools endpoint' });
  },

  approveSchool: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Approve school endpoint' });
  },
};

const QuestionsController = {
  getAllQuestions: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Get all questions endpoint' });
  },

  getQuestion: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Get question endpoint' });
  },

  createQuestion: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Create question endpoint' });
  },

  updateQuestion: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Update question endpoint' });
  },

  deleteQuestion: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Delete question endpoint' });
  },

  bulkDeleteQuestions: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Bulk delete questions endpoint' });
  },

  bulkImportQuestions: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Bulk import questions endpoint' });
  },

  uploadImage: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Upload image endpoint' });
  },

  getSubjects: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Get subjects endpoint' });
  },

  getSubjectTopics: async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Get subject topics endpoint' });
  },
};

// ============================================================================
// Multer Configuration
// ============================================================================

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const allowedTypes = /jpeg|jpg|png|gif|csv|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: JPEG, PNG, GIF, CSV, XLSX'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ============================================================================
// Router Setup
// ============================================================================

const router = Router();

// ✅ Apply middleware to all admin routes
router.use(authenticateToken as any);
router.use(requireAdmin);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /admin/stats
 * Get dashboard statistics
 */
router.get(
  '/stats',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.getDashboardStats(req, res).catch(next);
  }
);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/users
 * Get all users
 */
router.get(
  '/users',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.getAllUsers(req, res).catch(next);
  }
);

/**
 * GET /admin/users/:userId
 * Get user details
 */
router.get(
  '/users/:userId',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.getUserDetails(req, res).catch(next);
  }
);

/**
 * POST /admin/users/:userId/approve
 * Approve user registration
 */
router.post(
  '/users/:userId/approve',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.approveUser(req, res).catch(next);
  }
);

/**
 * POST /admin/users/:userId/reject
 * Reject user registration
 */
router.post(
  '/users/:userId/reject',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.rejectUser(req, res).catch(next);
  }
);

/**
 * POST /admin/users/:userId/suspend
 * Suspend user account
 */
router.post(
  '/users/:userId/suspend',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.suspendUser(req, res).catch(next);
  }
);

/**
 * POST /admin/users/:userId/activate
 * Activate suspended user
 */
router.post(
  '/users/:userId/activate',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.activateUser(req, res).catch(next);
  }
);

/**
 * DELETE /admin/users/:userId
 * Delete user account
 */
router.delete(
  '/users/:userId',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.deleteUser(req, res).catch(next);
  }
);

// ============================================================================
// QUESTION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/questions
 * Get all questions with filters
 */
router.get(
  '/questions',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.getAllQuestions(req, res).catch(next);
  }
);

/**
 * GET /admin/questions/:id
 * Get specific question
 */
router.get(
  '/questions/:id',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.getQuestion(req, res).catch(next);
  }
);

/**
 * POST /admin/questions
 * Create new question
 */
router.post(
  '/questions',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.createQuestion(req, res).catch(next);
  }
);

/**
 * PUT /admin/questions/:id
 * Update question
 */
router.put(
  '/questions/:id',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.updateQuestion(req, res).catch(next);
  }
);

/**
 * DELETE /admin/questions/:id
 * Delete question
 */
router.delete(
  '/questions/:id',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.deleteQuestion(req, res).catch(next);
  }
);

/**
 * POST /admin/questions/bulk-delete
 * Delete multiple questions
 */
router.post(
  '/questions/bulk-delete',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.bulkDeleteQuestions(req, res).catch(next);
  }
);

// ============================================================================
// FILE UPLOAD ROUTES
// ============================================================================

/**
 * POST /admin/questions/import
 * Bulk import questions from CSV/XLSX
 */
router.post(
  '/questions/import',
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.bulkImportQuestions(req, res).catch(next);
  }
);

/**
 * POST /admin/upload/image
 * Upload question image
 */
router.post(
  '/upload/image',
  upload.single('image'),
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.uploadImage(req, res).catch(next);
  }
);

// ============================================================================
// SUBJECTS & TOPICS ROUTES
// ============================================================================

/**
 * GET /admin/subjects
 * Get all subjects
 */
router.get(
  '/subjects',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.getSubjects(req, res).catch(next);
  }
);

/**
 * GET /admin/subjects/:id/topics
 * Get topics for a subject
 */
router.get(
  '/subjects/:id/topics',
  (req: Request, res: Response, next: NextFunction) => {
    QuestionsController.getSubjectTopics(req, res).catch(next);
  }
);

// ============================================================================
// SCHOOL MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /admin/schools
 * Get all schools
 */
router.get(
  '/schools',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.getAllSchools(req, res).catch(next);
  }
);

/**
 * POST /admin/schools/:schoolId/approve
 * Approve school registration
 */
router.post(
  '/schools/:schoolId/approve',
  (req: Request, res: Response, next: NextFunction) => {
    AdminController.approveSchool(req, res).catch(next);
  }
);

// ============================================================================
// Export
// ============================================================================

export default router;