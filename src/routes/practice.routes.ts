// backend/src/routes/practice.routes.ts
// ✅ FULLY FIXED - TypeScript errors resolved, proper error handling maintained

import { Router, Response, NextFunction, RequestHandler } from 'express';
import { PracticeController } from '../controllers/practice.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types/index';

const router = Router();

/**
 * Helper function to wrap async route handlers
 * Properly handles promise rejections and passes errors to Express error handler
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
 */
const auth = authenticateToken as unknown as RequestHandler;

// ============================================================================
// 🔓 PUBLIC ENDPOINTS - NO AUTHENTICATION REQUIRED
// ============================================================================

/**
 * GET /practice/subjects
 * @description Get all subjects available for practice
 * @query {string} [category] - Filter by category: SCIENCE|ART|COMMERCIAL
 * @returns {Object} { success: boolean, data: Subject[] }
 * @example GET /practice/subjects?category=SCIENCE
 */
router.get(
  '/subjects',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getSubjects(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch subjects',
      });
    }
  })
);

/**
 * GET /practice/subjects/:subjectId/topics
 * @description Get all topics for a specific subject
 * @param {string} subjectId - Subject identifier
 * @returns {Object} { success: boolean, data: Topic[] }
 * @example GET /practice/subjects/sci001/topics
 */
router.get(
  '/subjects/:subjectId/topics',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getTopicsForSubject(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching topics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch topics',
      });
    }
  })
);

// ============================================================================
// 🔐 AUTHENTICATED ENDPOINTS
// ============================================================================

/**
 * POST /practice/sessions
 * @description Start a new practice session
 * @auth Required (JWT token)
 * @body {string[]} subjectIds - Subject IDs to practice
 * @body {string[]} [topicIds] - Specific topics (optional)
 * @body {number} questionCount - Number of questions (1-100)
 * @body {string} [difficulty] - Difficulty level (EASY|MEDIUM|HARD|ALL)
 * @body {number} [duration] - Time limit in minutes (5-480)
 * @body {string} [type] - Session type (timed|untimed|PRACTICE|EXAM)
 * @returns {Object} { success: boolean, data: { sessionId, session, questions, totalAvailable } }
 * @example
 *   POST /practice/sessions
 *   Body: {
 *     subjectIds: ['sub1', 'sub2'],
 *     questionCount: 50,
 *     difficulty: 'MEDIUM',
 *     duration: 60,
 *     type: 'timed'
 *   }
 */
router.post(
  '/sessions',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      console.log('📝 Starting session for user:', req.user?.id);
      const result = await PracticeController.startSession(req, res);
      return result;
    } catch (error) {
      console.error('Error starting session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  })
);

/**
 * GET /practice/sessions
 * @description Get all practice sessions for current user
 * @auth Required (JWT token)
 * @query {number} [limit=10] - Results per page
 * @query {number} [offset=0] - Pagination offset
 * @query {string} [status] - Filter by status (NOT_STARTED|IN_PROGRESS|PAUSED|COMPLETED)
 * @returns {Object} { success: boolean, data: Session[], total, limit, offset }
 * @example GET /practice/sessions?limit=20&offset=0&status=COMPLETED
 */
router.get(
  '/sessions',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getUserSessions(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions',
      });
    }
  })
);

/**
 * GET /practice/sessions/:sessionId
 * @description Get details of a specific practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { success: boolean, data: Session }
 * @example GET /practice/sessions/sess123
 */
router.get(
  '/sessions/:sessionId',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
      }

      const result = await PracticeController.getSession(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching session:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session',
      });
    }
  })
);

/**
 * GET /practice/sessions/:sessionId/questions
 * @description Get all questions for a practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { success: boolean, data: Question[] }
 * @example GET /practice/sessions/sess123/questions
 */
router.get(
  '/sessions/:sessionId/questions',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getSessionQuestions(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch questions',
      });
    }
  })
);

// ============================================================================
// ✍️ ANSWER SUBMISSION
// ============================================================================

/**
 * POST /practice/sessions/:sessionId/answers
 * @description Submit multiple answers (BATCH - Preferred)
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @body {Array} answers - Array of answer objects
 * @body {string} answers[].questionId - Question ID
 * @body {string} answers[].selectedAnswer - Selected option
 * @returns {Object} { success: boolean, data: { processedCount, successCount, errorCount } }
 * @example
 *   POST /practice/sessions/sess123/answers
 *   Body: {
 *     answers: [
 *       { questionId: 'q1', selectedAnswer: 'A' },
 *       { questionId: 'q2', selectedAnswer: 'C' }
 *     ]
 *   }
 */
router.post(
  '/sessions/:sessionId/answers',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.submitAnswers(req, res);
      return result;
    } catch (error) {
      console.error('Error submitting answers:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit answers',
      });
    }
  })
);

/**
 * POST /practice/sessions/:sessionId/submit-answer
 * @description Submit a single answer
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @body {string} questionId - Question ID
 * @body {string} selectedAnswer - Selected option (A, B, C, D, etc.)
 * @returns {Object} { success: boolean, data: { questionId, isCorrect, correctAnswer } }
 * @example
 *   POST /practice/sessions/sess123/submit-answer
 *   Body: { questionId: 'q1', selectedAnswer: 'A' }
 */
router.post(
  '/sessions/:sessionId/submit-answer',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.submitAnswer(req, res);
      return result;
    } catch (error) {
      console.error('Error submitting answer:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit answer',
      });
    }
  })
);

// Alias for compatibility
router.post(
  '/sessions/:sessionId/answer',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.submitAnswer(req, res);
      return result;
    } catch (error) {
      console.error('Error submitting answer:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit answer',
      });
    }
  })
);

// ============================================================================
// 🚩 QUESTION FLAGGING
// ============================================================================

/**
 * POST /practice/sessions/:sessionId/toggle-flag
 * @description Flag or unflag a question for later review
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @body {string} questionId - Question ID
 * @body {boolean} isFlagged - true to flag, false to unflag
 * @returns {Object} { success: boolean, data: { questionId, isFlagged } }
 * @example
 *   POST /practice/sessions/sess123/toggle-flag
 *   Body: { questionId: 'q5', isFlagged: true }
 */
router.post(
  '/sessions/:sessionId/toggle-flag',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.toggleFlag(req, res);
      return result;
    } catch (error) {
      console.error('Error toggling flag:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to toggle flag',
      });
    }
  })
);

// ============================================================================
// ⏸️ SESSION STATE MANAGEMENT
// ============================================================================

/**
 * PATCH /practice/sessions/:sessionId/pause
 * @description Pause an active practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { success: boolean, data: { sessionId, status, pausedAt } }
 * @example PATCH /practice/sessions/sess123/pause
 */
router.patch(
  '/sessions/:sessionId/pause',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.pauseSession(req, res);
      return result;
    } catch (error) {
      console.error('Error pausing session:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to pause session',
      });
    }
  })
);

// Support POST for compatibility
router.post(
  '/sessions/:sessionId/pause',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.pauseSession(req, res);
      return result;
    } catch (error) {
      console.error('Error pausing session:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to pause session',
      });
    }
  })
);

/**
 * PATCH /practice/sessions/:sessionId/resume
 * @description Resume a paused practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { success: boolean, data: { sessionId, status, resumedAt } }
 * @example PATCH /practice/sessions/sess123/resume
 */
router.patch(
  '/sessions/:sessionId/resume',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.resumeSession(req, res);
      return result;
    } catch (error) {
      console.error('Error resuming session:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to resume session',
      });
    }
  })
);

// Support POST for compatibility
router.post(
  '/sessions/:sessionId/resume',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.resumeSession(req, res);
      return result;
    } catch (error) {
      console.error('Error resuming session:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to resume session',
      });
    }
  })
);

/**
 * POST /practice/sessions/:sessionId/complete
 * @description Complete/End a practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { success: boolean, data: { sessionId, status, score, results } }
 * @example POST /practice/sessions/sess123/complete
 */
router.post(
  '/sessions/:sessionId/complete',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.completeSession(req, res);
      return result;
    } catch (error) {
      console.error('Error completing session:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete session',
      });
    }
  })
);

// ============================================================================
// 📊 RESULTS & ANALYTICS
// ============================================================================

/**
 * GET /practice/sessions/:sessionId/results
 * @description Get detailed results for a specific completed session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { success: boolean, data: { session, answers: [] } }
 * @example GET /practice/sessions/sess123/results
 */
router.get(
  '/sessions/:sessionId/results',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getSessionResults(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching results:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch results',
      });
    }
  })
);

/**
 * GET /practice/sessions/:sessionId/history
 * @description Get detailed answer history for a session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { success: boolean, data: { answers: [], flaggedQuestions: [] } }
 * @example GET /practice/sessions/sess123/history
 */
router.get(
  '/sessions/:sessionId/history',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getAnswerHistory(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch history',
      });
    }
  })
);

// ============================================================================
// 🔄 BACKWARD COMPATIBILITY - V1 ENDPOINTS (DEPRECATED)
// ============================================================================

/**
 * POST /practice/start
 * @deprecated Use POST /practice/sessions instead
 */
router.post(
  '/start',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.startSession(req, res);
      return result;
    } catch (error) {
      console.error('Error starting session:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to start session',
      });
    }
  })
);

/**
 * GET /practice/user/sessions
 * @deprecated Use GET /practice/sessions instead
 */
router.get(
  '/user/sessions',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getUserSessions(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions',
      });
    }
  })
);

/**
 * GET /practice/results/:sessionId
 * @deprecated Use GET /practice/sessions/:sessionId/results instead
 */
router.get(
  '/results/:sessionId',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await PracticeController.getSessionResults(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching results:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch results',
      });
    }
  })
);

/**
 * GET /practice/user/results
 * @deprecated Use GET /practice/sessions with filtering instead
 */
router.get(
  '/user/results',
  auth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      // Alias to getUserSessions with completed filter
      req.query.status = 'COMPLETED';
      const result = await PracticeController.getUserSessions(req, res);
      return result;
    } catch (error) {
      console.error('Error fetching results:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch results',
      });
    }
  })
);

export default router;

/**
 * ============================================================================
 * API MIGRATION GUIDE
 * ============================================================================
 *
 * ✅ RECOMMENDED (V2 Endpoints):
 * - POST /practice/sessions
 * - GET /practice/sessions
 * - GET /practice/sessions/:id
 * - GET /practice/sessions/:id/questions
 * - POST /practice/sessions/:id/answers
 * - POST /practice/sessions/:id/complete
 * - GET /practice/sessions/:id/results
 *
 * ⚠️ DEPRECATED (V1 Endpoints - Still functional):
 * - POST /practice/start
 * - GET /practice/user/sessions
 * - GET /practice/results/:id
 *
 * ============================================================================
 */