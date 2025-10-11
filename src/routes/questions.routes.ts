import express from 'express';
import { QuestionsController } from '../controllers/questions.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/subjects', QuestionsController.getSubjects);
router.get('/subjects/:subjectId/topics', authenticateToken, QuestionsController.getTopics);
router.get('/questions', authenticateToken, QuestionsController.getQuestions);
router.get('/random', authenticateToken, QuestionsController.getRandomQuestions);
router.post('/questions/:questionId/check', authenticateToken, QuestionsController.checkAnswer);
router.post('/bulk-import', authenticateToken, QuestionsController.bulkImport);

export default router;