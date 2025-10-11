import express from 'express';
import { PracticeController } from '../controllers/practice.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// REMOVE AUTH TEMPORARILY FOR TESTING - subjects endpoint
router.get('/subjects', PracticeController.getSubjectsForPractice); // NO AUTH for testing

// Other routes WITH auth
router.get('/sessions/:sessionId/questions', authenticateToken, PracticeController.getSessionQuestions);
router.post('/sessions/:sessionId/answer', authenticateToken, PracticeController.submitAnswer);
router.post('/sessions/:sessionId/complete', authenticateToken, PracticeController.completeSession);
router.get('/sessions/:sessionId/results', authenticateToken, PracticeController.getSessionResults);
router.get('/subjects/:subjectId/topics', PracticeController.getTopicsForSubject);
router.post('/sessions/:sessionId/questions/:questionId/flag', authenticateToken, PracticeController.toggleFlag);
router.post('/sessions/:sessionId/pause', authenticateToken, PracticeController.pauseSession);
router.post('/sessions/:sessionId/resume', authenticateToken, PracticeController.resumeSession);
router.get('/sessions/:sessionId/questions/:questionId/history', authenticateToken, PracticeController.getAnswerHistory);
router.get('/:sessionId/results', authenticateToken, PracticeController.getResults);
router.post('/start', authenticateToken, PracticeController.start);
router.get('/sessions/:sessionId', authenticateToken, PracticeController.getSession);

export default router;