import express from 'express';
import { ComprehensiveExamController } from '../controllers/comprehensiveExam.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/create', authenticateToken, ComprehensiveExamController.createExam);
router.get('/list', authenticateToken, ComprehensiveExamController.getUserExams);
router.get('/:examId', authenticateToken, ComprehensiveExamController.getExam);
router.post('/:examId/day/:dayNumber/start', authenticateToken, ComprehensiveExamController.startDay);
router.post('/:examId/day/:dayNumber/complete', authenticateToken, ComprehensiveExamController.completeDay);
router.get('/:examId/results', authenticateToken, ComprehensiveExamController.getExamResults);

export default router;