import { Router, Response, NextFunction, RequestHandler } from 'express';
import { QuestionsController } from '../controllers/questions.controller';
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
// QUESTIONS ROUTES
// ============================================================================

/**
 * GET /questions/subjects
 * Get all subjects available
 * NO AUTH - Public endpoint
 */
router.get(
  '/subjects',
  asyncHandler(QuestionsController.getSubjects)
);

/**
 * GET /questions/subjects/:subjectId/topics
 * Get topics for a specific subject
 * AUTH required
 */
router.get(
  '/subjects/:subjectId/topics',
  auth,
  asyncHandler(QuestionsController.getSubjectTopics)
);

/**
 * GET /questions/questions
 * Get questions with filtering and pagination
 * AUTH required
 */
router.get(
  '/questions',
  auth,
  asyncHandler(QuestionsController.getQuestions)
);

/**
 * GET /questions/random
 * Get random questions for practice
 * AUTH required
 */
router.get(
  '/random',
  auth,
  asyncHandler(QuestionsController.getRandomQuestions)
);

/**
 * POST /questions/questions/:questionId/check
 * Check if answer is correct
 * Body: { answer }
 * AUTH required
 */
router.post(
  '/questions/:questionId/check',
  auth,
  asyncHandler(QuestionsController.checkAnswer)
);

/**
 * POST /questions/bulk-import
 * Bulk import questions
 * Body: { questions: Array, subjectId }
 * AUTH required
 */
router.post(
  '/bulk-import',
  auth,
  asyncHandler(QuestionsController.bulkImport)
);

// ============================================================================
// Additional Question Routes (not in original but useful)
// ============================================================================

/**
 * GET /questions/:questionId
 * Get a single question by ID
 * AUTH required
 */
router.get(
  '/:questionId',
  auth,
  asyncHandler(QuestionsController.getQuestion)
);

/**
 * POST /questions
 * Create a new question
 * Body: { question, options, correctAnswer, subject, difficulty, type }
 * AUTH required
 */
router.post(
  '/',
  auth,
  asyncHandler(QuestionsController.createQuestion)
);

/**
 * PUT /questions/:questionId
 * Update a question
 * Body: { question, options, correctAnswer, difficulty, type }
 * AUTH required
 */
router.put(
  '/:questionId',
  auth,
  asyncHandler(QuestionsController.updateQuestion)
);

/**
 * DELETE /questions/:questionId
 * Delete a question
 * AUTH required
 */
router.delete(
  '/:questionId',
  auth,
  asyncHandler(QuestionsController.deleteQuestion)
);

/**
 * POST /questions/bulk-delete
 * Bulk delete multiple questions
 * Body: { ids: Array<string> }
 * AUTH required
 */
router.post(
  '/bulk-delete',
  auth,
  asyncHandler(QuestionsController.bulkDeleteQuestions)
);

/**
 * POST /questions/import
 * Bulk import questions from file (deprecated - use bulk-import instead)
 * AUTH required
 */
router.post(
  '/import',
  auth,
  asyncHandler(QuestionsController.bulkImportQuestions)
);

/**
 * POST /questions/upload-image
 * Upload image for question
 * AUTH required
 */
router.post(
  '/upload-image',
  auth,
  asyncHandler(QuestionsController.uploadImage)
);

/**
 * GET /questions/all
 * Get all questions (deprecated - use /questions instead)
 * AUTH required
 */
router.get(
  '/all',
  auth,
  asyncHandler(QuestionsController.getAllQuestions)
);

// ============================================================================
// Export Router
// ============================================================================

export default router;