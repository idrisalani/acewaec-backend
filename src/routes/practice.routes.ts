import { Router, Response, NextFunction, RequestHandler } from 'express';
import { PracticeController } from '../controllers/practice.controller';
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
// PRACTICE ROUTES
// ============================================================================

/**
 * GET /practice/subjects
 * Get all subjects available for practice
 * Query param: ?category=SCIENCE|ART|COMMERCIAL
 * NO AUTH - Public endpoint for testing
 */
router.get(
  '/subjects',
  asyncHandler(PracticeController.getSubjects)  // ✅ FIXED: Was getSubjectsForPractice
);

/**
 * GET /practice/subjects/:subjectId/topics
 * Get topics for a specific subject
 * NO AUTH - Public endpoint for testing
 */
router.get(
  '/subjects/:subjectId/topics',
  asyncHandler(PracticeController.getTopicsForSubject)
);

/**
 * POST /practice/start
 * Start a new practice session
 * Body: { subjectId, topicId?, numberOfQuestions }
 * AUTH required
 */
router.post(
  '/start',
  auth,
  asyncHandler(PracticeController.start)
);

/**
 * GET /practice/sessions/:sessionId
 * Get details of an active practice session
 * AUTH required
 */
router.get(
  '/sessions/:sessionId',
  auth,
  asyncHandler(PracticeController.getSession)
);

/**
 * GET /practice/sessions/:sessionId/questions
 * Get questions for current practice session
 * AUTH required
 */
router.get(
  '/sessions/:sessionId/questions',
  auth,
  asyncHandler(PracticeController.getSessionQuestions)
);

/**
 * POST /practice/sessions/:sessionId/submit-answer
 * Submit an answer for a question in practice session
 * Body: { questionId, selectedAnswer }
 * AUTH required
 */
router.post(
  '/sessions/:sessionId/submit-answer',
  auth,
  asyncHandler(PracticeController.submitAnswer)
);

/**
 * POST /practice/sessions/:sessionId/answer
 * Alternative endpoint name for submitting answers
 * Body: { questionId, selectedAnswer }
 * AUTH required
 */
router.post(
  '/sessions/:sessionId/answer',
  auth,
  asyncHandler(PracticeController.submitAnswer)
);

/**
 * POST /practice/sessions/:sessionId/toggle-flag
 * Flag/unflag a question for review
 * Body: { questionId, isFlagged }
 * AUTH required
 */
router.post(
  '/sessions/:sessionId/toggle-flag',
  auth,
  asyncHandler(PracticeController.toggleFlag)
);

/**
 * POST /practice/sessions/:sessionId/pause
 * Pause a practice session
 * AUTH required
 */
router.post(
  '/sessions/:sessionId/pause',
  auth,
  asyncHandler(PracticeController.pauseSession)
);

/**
 * POST /practice/sessions/:sessionId/resume
 * Resume a paused practice session
 * AUTH required
 */
router.post(
  '/sessions/:sessionId/resume',
  auth,
  asyncHandler(PracticeController.resumeSession)
);

/**
 * POST /practice/sessions/:sessionId/complete
 * Complete/End a practice session and get results
 * AUTH required
 */
router.post(
  '/sessions/:sessionId/complete',
  auth,
  asyncHandler(PracticeController.completeSession)
);

/**
 * GET /practice/sessions/:sessionId/results
 * Get results of a completed practice session
 * Alternative endpoint name (used by frontend)
 * AUTH required
 */
router.get(
  '/sessions/:sessionId/results',
  auth,
  asyncHandler(PracticeController.getSessionResults)
);

/**
 * GET /practice/results/:sessionId
 * Get results of a completed practice session
 * AUTH required
 */
router.get(
  '/results/:sessionId',
  auth,
  asyncHandler(PracticeController.getSessionResults)
);

/**
 * GET /practice/sessions/:sessionId/history
 * Get answer history for a session
 * AUTH required
 */
router.get(
  '/sessions/:sessionId/history',
  auth,
  asyncHandler(PracticeController.getAnswerHistory)
);

/**
 * GET /practice/user/results
 * Get all results for current user
 * AUTH required
 */
router.get(
  '/user/results',
  auth,
  asyncHandler(PracticeController.getResults)
);

/**
 * GET /practice/user/sessions
 * Get all practice sessions for current user
 * AUTH required
 */
router.get(
  '/user/sessions',
  auth,
  asyncHandler(PracticeController.getUserSessions)  // ✅ NEW METHOD
);

// ============================================================================
// Export Router
// ============================================================================

export default router;