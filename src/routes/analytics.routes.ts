import express from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/dashboard', authenticateToken, AnalyticsController.getDashboard);
router.get('/subjects/:subjectId', authenticateToken, AnalyticsController.getSubjectAnalytics);
router.get('/trend', authenticateToken, AnalyticsController.getPerformanceTrend);
router.get('/weak-areas', authenticateToken, AnalyticsController.getWeakAreas);

export default router;