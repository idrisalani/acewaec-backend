import { Router, Response, NextFunction, RequestHandler } from 'express';
import { ComprehensiveExamController } from '../controllers/comprehensiveExam.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types/index';

const router = Router();

/**
 * Helper function to wrap async route handlers
 * Converts AuthRequest handlers to RequestHandler for Express compatibility
 * Accepts any return type from controller methods
 */
const asyncHandler = (
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return ((req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  }) as RequestHandler;
};

/**
 * Cast middleware to RequestHandler for Express Router compatibility
 * Our middleware uses AuthRequest, but Express Router expects Request
 * This tells TypeScript to treat our middleware as compatible with Express
 */
const auth = authenticateToken as unknown as RequestHandler;

// ============================================================================
// COMPREHENSIVE EXAM ROUTES
// ============================================================================

/**
 * POST /exams
 * Create a new comprehensive exam
 * Body: { subjects, questionsPerSubject, totalDays }
 * AUTH required
 */
router.post(
  '/',
  auth,
  asyncHandler(ComprehensiveExamController.createExam)
);

/**
 * GET /exams
 * Get all exams for current user
 * AUTH required
 */
router.get(
  '/',
  auth,
  asyncHandler(ComprehensiveExamController.getUserExams)
);

/**
 * GET /exams/:examId
 * Get details of a specific exam
 * AUTH required
 */
router.get(
  '/:examId',
  auth,
  asyncHandler(ComprehensiveExamController.getExam)
);

/**
 * POST /exams/:examId/start-day
 * Start exam for a specific day
 * Body: { dayNumber }
 * AUTH required
 */
router.post(
  '/:examId/start-day',
  auth,
  asyncHandler(ComprehensiveExamController.startDay)
);

/**
 * POST /exams/:examId/complete-day
 * Complete exam for a specific day
 * Body: { dayNumber, answers }
 * AUTH required
 */
router.post(
  '/:examId/complete-day',
  auth,
  asyncHandler(ComprehensiveExamController.completeDay)
);

/**
 * GET /exams/:examId/results
 * Get results of a completed exam
 * AUTH required
 */
router.get(
  '/:examId/results',
  auth,
  asyncHandler(ComprehensiveExamController.getExamResults)
);

/**
 * POST /exams/:examId/pause
 * Pause an exam
 * AUTH required
 */
router.post(
  '/:examId/pause',
  auth,
  asyncHandler(ComprehensiveExamController.pauseExam)
);

/**
 * POST /exams/:examId/resume
 * Resume a paused exam
 * AUTH required
 */
router.post(
  '/:examId/resume',
  auth,
  asyncHandler(ComprehensiveExamController.resumeExam)
);

/**
 * DELETE /exams/:examId
 * Delete an exam
 * AUTH required
 */
router.delete(
  '/:examId',
  auth,
  asyncHandler(ComprehensiveExamController.deleteExam)
);

// ============================================================================
// Export Router
// ============================================================================

export default router;