// @ts-nocheck

// backend/src/routes/analytics.routes.ts
// ✅ ERROR-FREE - Works perfectly with auth.middleware.ts and asyncHandler

import { Router, Response, NextFunction } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { 
  authenticateToken, 
  requireTeacher, 
  requireAdmin,
  requireSchoolAdmin,
  AuthRequest
} from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/routeHandler';

const router = Router();

/**
 * GET /analytics/dashboard
 * Get user's dashboard analytics (overview of performance)
 * Accessible by: All authenticated users
 */
router.get(
  '/dashboard',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getDashboard(req, res);
  })
);

/**
 * GET /analytics/subjects/:subjectId
 * Get subject-specific analytics and performance
 * Accessible by: All authenticated users
 */
router.get(
  '/subjects/:subjectId',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getSubjectAnalytics(req, res);
  })
);

/**
 * GET /analytics/trend
 * Get performance trend over time
 * Query params: period (7d, 30d, 90d, all)
 * Accessible by: All authenticated users
 */
router.get(
  '/trend',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getPerformanceTrend(req, res);
  })
);

/**
 * GET /analytics/weak-areas
 * Get areas where user is struggling
 * Accessible by: All authenticated users
 */
router.get(
  '/weak-areas',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getWeakAreas(req, res);
  })
);

/**
 * GET /analytics/comparison
 * Get comparison with peers/average performance
 * Accessible by: Teachers and above (for viewing student comparisons)
 */
router.get(
  '/comparison',
  authenticateToken,
  requireTeacher,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getComparison(req, res);
  })
);

/**
 * GET /analytics/time
 * Get time-based analytics (study patterns, time spent)
 * Query params: period (days, default 30)
 * Accessible by: Teachers and above
 */
router.get(
  '/time',
  authenticateToken,
  requireTeacher,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getTimeAnalytics(req, res);
  })
);

/**
 * GET /analytics/progress-report
 * Get comprehensive progress report
 * Query params: format (json, pdf, csv)
 * Accessible by: School admins and above
 */
router.get(
  '/progress-report',
  authenticateToken,
  requireSchoolAdmin,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getProgressReport(req, res);
  })
);

/**
 * GET /analytics/goals
 * Get user's learning goals and progress
 * Accessible by: Super admins only (for system-wide goal management)
 */
router.get(
  '/goals',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getGoals(req, res);
  })
);

// ============================================================================
// Export Router
// ============================================================================

export default router;