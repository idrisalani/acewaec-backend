/**
 * backend/src/routes/practice.routes.ts
 * ✅ RECONCILED VERSION - Combines V1 & V2 best practices
 * 
 * This file merges both versions with:
 * - Modern RESTful V2 endpoints as primary
 * - V1 endpoints preserved for backward compatibility
 * - Clear deprecation markers
 */

import { Router, Response, NextFunction, RequestHandler } from 'express';
import { PracticeController } from '../controllers/practice.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types/index';

const router = Router();

/**
 * Helper function to wrap async route handlers
 * Converts AuthRequest handlers to RequestHandler for Express compatibility
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
 * @public No authentication required
 * @example GET /practice/subjects?category=SCIENCE
 */
router.get(
  '/subjects',
  asyncHandler(PracticeController.getSubjects)
);

/**
 * GET /practice/subjects/:subjectId/topics
 * @description Get all topics for a specific subject
 * @param {string} subjectId - Subject identifier
 * @public No authentication required
 * @example GET /practice/subjects/sci001/topics
 */
router.get(
  '/subjects/:subjectId/topics',
  asyncHandler(PracticeController.getTopicsForSubject)
);

// ============================================================================
// 🔐 PRIMARY ENDPOINTS - AUTHENTICATED (RESTful V2 Design)
// ============================================================================
// These are the recommended endpoints for new implementations
// ============================================================================

/**
 * POST /practice/sessions
 * @description Start a new practice session with flexible parameters
 * @auth Required (JWT token)
 * @body {string[]} subjectIds - Subject IDs to practice
 * @body {string[]} [topicIds] - Specific topics (optional)
 * @body {number} questionCount - Number of questions
 * @body {string} [difficulty] - 'easy' | 'medium' | 'hard'
 * @body {number} [duration] - Time limit in minutes
 * @body {string} [type] - 'timed' | 'untimed'
 * @returns {Object} { sessionId, startedAt, questionsCount, duration }
 * @example POST /practice/sessions
 *          Body: { subjectIds: ['sub1'], questionCount: 50, difficulty: 'medium' }
 */
router.post(
  '/sessions',
  auth,
  asyncHandler(PracticeController.startSession)
);

/**
 * GET /practice/sessions
 * @description Get all practice sessions for current user with pagination
 * @auth Required (JWT token)
 * @query {number} [limit=10] - Results per page
 * @query {number} [offset=0] - Pagination offset
 * @query {string} [status] - Filter by status: active|completed|paused
 * @returns {Object} { data: Session[], total, limit, offset }
 * @example GET /practice/sessions?limit=20&offset=0&status=completed
 */
router.get(
  '/sessions',
  auth,
  asyncHandler(PracticeController.getUserSessions)
);

/**
 * GET /practice/sessions/:sessionId
 * @description Get details of a specific practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} Full session object with metadata
 * @example GET /practice/sessions/sess123
 */
router.get(
  '/sessions/:sessionId',
  auth,
  asyncHandler(PracticeController.getSession)
);

/**
 * GET /practice/sessions/:sessionId/questions
 * @description Get all questions for a practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { questions: Question[], totalCount }
 * @example GET /practice/sessions/sess123/questions
 */
router.get(
  '/sessions/:sessionId/questions',
  auth,
  asyncHandler(PracticeController.getSessionQuestions)
);

// ============================================================================
// ✍️ ANSWER SUBMISSION - SUPPORTS BOTH BATCH & SINGLE
// ============================================================================
// Batch submission recommended for better performance
// Single submission supported for real-time UX patterns
// ============================================================================

/**
 * POST /practice/sessions/:sessionId/answers
 * @description Submit multiple answers (BATCH - Preferred)
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @body {Array} answers - Array of answer objects
 * @body {string} answers[].questionId - Question ID
 * @body {string} answers[].selectedAnswer - Selected option
 * @body {number} [answers[].timeSpent] - Time spent on question (ms)
 * @returns {Object} { processedCount, successCount, errorCount, errors[] }
 * @example POST /practice/sessions/sess123/answers
 *          Body: {
 *            answers: [
 *              { questionId: 'q1', selectedAnswer: 'A', timeSpent: 15000 },
 *              { questionId: 'q2', selectedAnswer: 'C', timeSpent: 12000 }
 *            ]
 *          }
 */
router.post(
  '/sessions/:sessionId/answers',
  auth,
  asyncHandler(PracticeController.submitAnswers)
);

/**
 * POST /practice/sessions/:sessionId/submit-answer
 * @description Submit a single answer (One at a time - for real-time UX)
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @body {string} questionId - Question ID
 * @body {string} selectedAnswer - Selected option (A, B, C, D, etc.)
 * @returns {Object} { success, feedback?, nextQuestion? }
 * @example POST /practice/sessions/sess123/submit-answer
 *          Body: { questionId: 'q1', selectedAnswer: 'A' }
 * @note Use this for immediate answer feedback during practice
 */
router.post(
  '/sessions/:sessionId/submit-answer',
  auth,
  asyncHandler(PracticeController.submitAnswer)
);

/**
 * POST /practice/sessions/:sessionId/answer
 * @description Submit a single answer (Alternative endpoint name)
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @body {string} questionId - Question ID
 * @body {string} selectedAnswer - Selected option
 * @deprecated Use /submit-answer instead. This is an alias for compatibility.
 * @example POST /practice/sessions/sess123/answer
 */
router.post(
  '/sessions/:sessionId/answer',
  auth,
  asyncHandler(PracticeController.submitAnswer)
);

// ============================================================================
// 🚩 QUESTION FLAGGING
// ============================================================================

/**
 * POST /practice/sessions/:sessionId/toggle-flag
 * @description Flag or unflag a question for later review
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @body {string} questionId - Question ID to flag
 * @body {boolean} isFlagged - true to flag, false to unflag
 * @returns {Object} { questionId, isFlagged, totalFlagged }
 * @example POST /practice/sessions/sess123/toggle-flag
 *          Body: { questionId: 'q5', isFlagged: true }
 */
router.post(
  '/sessions/:sessionId/toggle-flag',
  auth,
  asyncHandler(PracticeController.toggleFlag)
);

// ============================================================================
// ⏸️ SESSION STATE MANAGEMENT - PRIMARY (RESTful PATCH)
// ============================================================================
// PATCH is more semantically correct for state modifications
// ============================================================================

/**
 * PATCH /practice/sessions/:sessionId/pause
 * @description Pause an active practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { sessionId, status: 'paused', pausedAt }
 * @example PATCH /practice/sessions/sess123/pause
 */
router.patch(
  '/sessions/:sessionId/pause',
  auth,
  asyncHandler(PracticeController.pauseSession)
);

/**
 * PATCH /practice/sessions/:sessionId/resume
 * @description Resume a paused practice session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { sessionId, status: 'active', resumedAt }
 * @example PATCH /practice/sessions/sess123/resume
 */
router.patch(
  '/sessions/:sessionId/resume',
  auth,
  asyncHandler(PracticeController.resumeSession)
);

/**
 * POST /practice/sessions/:sessionId/complete
 * @description Complete/End a practice session and calculate results
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { sessionId, status: 'completed', results: {...} }
 * @example POST /practice/sessions/sess123/complete
 */
router.post(
  '/sessions/:sessionId/complete',
  auth,
  asyncHandler(PracticeController.completeSession)
);

// ============================================================================
// 📊 RESULTS & ANALYTICS
// ============================================================================

/**
 * GET /practice/sessions/:sessionId/results
 * @description Get detailed results for a specific completed session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} {
 *   sessionId, totalQuestions, attemptedQuestions, correctAnswers,
 *   score, percentage, timeSpent, analysis: {...}
 * }
 * @example GET /practice/sessions/sess123/results
 */
router.get(
  '/sessions/:sessionId/results',
  auth,
  asyncHandler(PracticeController.getSessionResults)
);

/**
 * GET /practice/sessions/:sessionId/history
 * @description Get detailed answer history and review data for a session
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} {
 *   answers: [{ questionId, selectedAnswer, correctAnswer, isCorrect, explanation }],
 *   flaggedQuestions: string[],
 *   reviewSummary: {...}
 * }
 * @example GET /practice/sessions/sess123/history
 * @note Useful for post-session review and learning
 */
router.get(
  '/sessions/:sessionId/history',
  auth,
  asyncHandler(PracticeController.getAnswerHistory)
);

// ============================================================================
// 🔄 BACKWARD COMPATIBILITY - DEPRECATED V1 ENDPOINTS
// ============================================================================
// These endpoints are preserved for existing integrations
// @deprecated - Migrate to new endpoints above
// ============================================================================

/**
 * POST /practice/start
 * @deprecated Use POST /practice/sessions instead
 * @description Start a new practice session (Legacy V1 endpoint)
 * @auth Required (JWT token)
 * @body {string} subjectId - Subject ID
 * @body {string} [topicId] - Topic ID (optional)
 * @body {number} numberOfQuestions - Number of questions
 * @returns {Object} { sessionId, startedAt }
 * @example POST /practice/start
 *          Body: { subjectId: 'sub1', numberOfQuestions: 50 }
 * @note This is an alias. Please use POST /practice/sessions for new code.
 */
router.post(
  '/start',
  auth,
  asyncHandler(PracticeController.startSession)
);

/**
 * GET /practice/user/sessions
 * @deprecated Use GET /practice/sessions instead
 * @description Get all practice sessions for current user (Legacy V1 endpoint)
 * @auth Required (JWT token)
 * @returns {Object} { sessions: Session[] }
 * @example GET /practice/user/sessions
 * @note This is an alias. Please use GET /practice/sessions for new code.
 */
router.get(
  '/user/sessions',
  auth,
  asyncHandler(PracticeController.getUserSessions)
);

/**
 * GET /practice/results/:sessionId
 * @deprecated Use GET /practice/sessions/:sessionId/results instead
 * @description Get results for a session (Legacy V1 endpoint)
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} Results object
 * @example GET /practice/results/sess123
 * @note This is an alias. Please use the nested results endpoint for new code.
 */
router.get(
  '/results/:sessionId',
  auth,
  asyncHandler(PracticeController.getSessionResults)
);

/**
 * GET /practice/user/results
 * @deprecated Use GET /practice/sessions with filtering instead
 * @description Get all results for current user (Legacy V1 endpoint)
 * @auth Required (JWT token)
 * @returns {Object} { results: [...] }
 * @example GET /practice/user/results
 * @note This is an alias. Consider using GET /practice/sessions?status=completed
 */
router.get(
  '/user/results',
  auth,
  asyncHandler(PracticeController.getResults)
);

/**
 * POST /practice/sessions/:sessionId/pause
 * @deprecated Use PATCH /practice/sessions/:sessionId/pause instead
 * @description Pause a session (Legacy V1 HTTP method)
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { sessionId, status: 'paused' }
 * @example POST /practice/sessions/sess123/pause
 * @note PATCH is more RESTful for state changes
 */
router.post(
  '/sessions/:sessionId/pause',
  auth,
  asyncHandler(PracticeController.pauseSession)
);

/**
 * POST /practice/sessions/:sessionId/resume
 * @deprecated Use PATCH /practice/sessions/:sessionId/resume instead
 * @description Resume a session (Legacy V1 HTTP method)
 * @auth Required (JWT token)
 * @param {string} sessionId - Session identifier
 * @returns {Object} { sessionId, status: 'active' }
 * @example POST /practice/sessions/sess123/resume
 * @note PATCH is more RESTful for state changes
 */
router.post(
  '/sessions/:sessionId/resume',
  auth,
  asyncHandler(PracticeController.resumeSession)
);

// ============================================================================
// 📤 EXPORT
// ============================================================================

export default router;

/**
 * ============================================================================
 * MIGRATION GUIDE FOR DEVELOPERS
 * ============================================================================
 *
 * STEP 1: Update Session Creation
 * ❌ OLD: POST /practice/start { subjectId, numberOfQuestions }
 * ✅ NEW: POST /practice/sessions { subjectIds[], questionCount, difficulty }
 *
 * STEP 2: Update Session Listing
 * ❌ OLD: GET /practice/user/sessions
 * ✅ NEW: GET /practice/sessions?limit=20&offset=0
 *
 * STEP 3: Update Answer Submission
 * ❌ OLD: POST /practice/sessions/{id}/submit-answer (one at a time)
 * ✅ NEW: POST /practice/sessions/{id}/answers (batch at end)
 * ℹ️ BOTH still supported for flexibility
 *
 * STEP 4: Update Pause/Resume
 * ❌ OLD: POST /practice/sessions/{id}/pause
 * ✅ NEW: PATCH /practice/sessions/{id}/pause
 * ℹ️ Both still supported
 *
 * STEP 5: Update Results Retrieval
 * ❌ OLD: GET /practice/results/{id} or GET /practice/user/results
 * ✅ NEW: GET /practice/sessions/{id}/results
 *
 * TIMELINE:
 * - Now: Both versions work (V1 deprecated but functional)
 * - Week 2: Frontend updates to V2 endpoints
 * - Week 4: Partner APIs notified of deprecation
 * - Week 6: V1 endpoints disabled (with 7-day warning)
 *
 * ============================================================================
 */