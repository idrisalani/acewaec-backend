/**
 * backend/src/controllers/practice.controller.ts
 * ✅ FIXED - Response Format Consistency + userId Fix
 * 
 * FIXES APPLIED:
 * 1. ✅ ALL endpoints now return consistent { success, data } format
 * 2. ✅ getSession returns { success: true, data: { session, sessionId } }
 * 3. ✅ getSessionQuestions returns { success: true, data: [...] }
 * 4. ✅ Added userId to PracticeAnswer.create() calls (CRITICAL FIX)
 * 5. ✅ Proper error handling with correct status codes
 */

import { Response } from 'express';
import { AuthRequest } from '../types/index';
import { PrismaClient, SessionStatus } from '@prisma/client';
import { QuestionsService } from '../services/questions.service';
import { AnalyticsService } from '../services/analytics.service';

const prisma = new PrismaClient();

export class PracticeController {
  // ============================================================================
  // 🔓 PUBLIC ENDPOINTS (NO AUTH REQUIRED)
  // ============================================================================

  /**
   * Get all subjects
   * GET /practice/subjects
   * ✅ FIXED: Consistent response format
   */
  static async getSubjects(req: AuthRequest, res: Response) {
    try {
      const { category } = req.query;

      console.log('📚 Fetching subjects...');
      console.log('   Category:', category || 'All');

      const subjects = await prisma.subject.findMany({
        where: {
          ...(category && category !== 'ALL' && {
            categories: {
              has: category as string
            }
          }),
          isActive: true
        },
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { name: 'asc' },
      });

      // ✅ Deduplication by ID
      const uniqueMap = new Map<string, any>();
      subjects.forEach(subject => {
        if (!uniqueMap.has(subject.id)) {
          uniqueMap.set(subject.id, {
            id: subject.id,
            name: subject.name,
            code: subject.code,
            categories: subject.categories,
            description: subject.description,
            questionCount: subject._count?.questions || 0
          });
        }
      });

      const uniqueSubjects = Array.from(uniqueMap.values());

      console.log(`✅ Found ${uniqueSubjects.length} unique subjects`);

      // Set cache headers
      res.set('Cache-Control', 'public, max-age=300');

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: uniqueSubjects
      });
    } catch (error) {
      console.error('❌ Error fetching subjects:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch subjects',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get topics for a specific subject
   * GET /practice/subjects/:subjectId/topics
   * ✅ FIXED: Consistent response format
   */
  static async getTopicsForSubject(req: AuthRequest, res: Response) {
    try {
      const { subjectId } = req.params;

      if (!subjectId) {
        return res.status(400).json({
          success: false,
          error: 'Subject ID is required'
        });
      }

      console.log(`🔍 Fetching topics for subject: ${subjectId}`);

      const topics = await prisma.topic.findMany({
        where: {
          subjectId,
          isActive: true
        },
        distinct: ['id'],
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      const uniqueTopicsMap = new Map<string, any>();
      topics.forEach(topic => {
        if (!uniqueTopicsMap.has(topic.id)) {
          uniqueTopicsMap.set(topic.id, {
            id: topic.id,
            name: topic.name,
            questionCount: topic._count.questions
          });
        }
      });

      const uniqueTopics = Array.from(uniqueTopicsMap.values());

      console.log(`✅ Returning ${uniqueTopics.length} unique topics for subject ${subjectId}`);

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: uniqueTopics
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get topics';
      console.error(`❌ Error in getTopicsForSubject:`, message);
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  }

  // ============================================================================
  // 🔐 SESSION MANAGEMENT - PRIMARY ENDPOINTS
  // ============================================================================

  /**
   * ✅ FIXED: Start Practice Session
   * ✅ FIXED: Removed 'next' parameter
   * ✅ FIXED: Added userId to PracticeAnswer creation (Line 318)
   */
  static async startSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        console.error('❌ No user ID in request');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: No user ID',
        });
      }

      console.log('👤 User ID:', req.user.id);

      const {
        subjectIds,
        topicIds = [],
        questionCount,
        duration,
        difficulty,
        type = 'PRACTICE'
      } = req.body;

      console.log('📥 Request body:', {
        subjectIds,
        topicIds,
        questionCount,
        duration,
        difficulty,
        type
      });

      if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'subjectIds must be a non-empty array',
        });
      }

      if (typeof questionCount !== 'number' || questionCount < 1 || questionCount > 100) {
        return res.status(400).json({
          success: false,
          error: 'questionCount must be between 1 and 100',
        });
      }

      const typeMapping: { [key: string]: string } = {
        'TIMED': 'TIMED_TEST',
        'TIMED_TEST': 'TIMED_TEST',
        'UNTIMED': 'PRACTICE',
        'PRACTICE': 'PRACTICE',
        'COMPREHENSIVE': 'COMPREHENSIVE',
        'MOCK_EXAM': 'MOCK_EXAM',
        'CUSTOM': 'CUSTOM',
      };

      const sessionType = typeMapping[type] || 'PRACTICE';

      console.log('🔍 Fetching questions for subjects:', subjectIds);

      const questions = await prisma.question.findMany({
        where: {
          subjectId: { in: subjectIds },
          ...(topicIds.length > 0 && { topicId: { in: topicIds } }),
          ...(difficulty && difficulty !== 'ALL' && { difficulty }),
        },
        take: questionCount,
        include: {
          subject: true,
          topic: true,
          options: true,
        },
      });

      console.log(`✅ Found ${questions.length} questions`);

      if (questions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No questions available with the selected criteria',
        });
      }

      console.log('💾 Creating practice session...');

      const session = await prisma.practiceSession.create({
        data: {
          userId: req.user.id,
          name: `Practice Session - ${new Date().toLocaleString()}`,
          type: sessionType as any,
          status: 'IN_PROGRESS',
          totalQuestions: questions.length,
          duration: duration || null,
          difficulty: difficulty || null,
          startedAt: new Date(),
          subjectIds: subjectIds,
          topicIds: topicIds,
        },
      });

      console.log('✅ Session created:', session.id);

      console.log('🔗 Mapping questions to session...');

      // ✅ CRITICAL FIX: Added userId field (required in Prisma schema)
      await Promise.all(
        questions.map((q) =>
          prisma.practiceAnswer.create({
            data: {
              sessionId: session.id,
              userId: req.user.id,  // ✅ FIX: Required field
              questionId: q.id,
              selectedAnswer: null,
              isCorrect: false,
            },
          })
        )
      );

      console.log(`✅ Mapped ${questions.length} questions`);

      const response = {
        success: true,
        data: {
          sessionId: session.id,
          session: {
            id: session.id,
            name: session.name,
            type: session.type,
            status: session.status,
            totalQuestions: session.totalQuestions,
            duration: session.duration,
            createdAt: session.startedAt,
          },
          questions: questions.map((q, index) => ({
            id: q.id,
            content: q.content,
            imageUrl: q.imageUrl,
            difficulty: q.difficulty,
            subject: q.subject ? {
              id: q.subject.id,
              name: q.subject.name,
              code: q.subject.code
            } : null,
            topic: q.topic ? {
              id: q.topic.id,
              name: q.topic.name
            } : null,
            options: (q.options || [])
              .sort((a, b) => a.label.localeCompare(b.label))
              .map(opt => ({
                id: opt.id,
                label: opt.label,
                content: opt.content
              })),
            questionNumber: index + 1,
            totalQuestions: questions.length
          })),
          totalAvailable: questions.length,
        },
      };

      console.log('📤 Sending response:', {
        sessionId: session.id,
        questionsCount: questions.length,
        sessionType: session.type
      });

      return res.status(201).json(response);

    } catch (error) {
      console.error('❌ ERROR in startSession:', error);

      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });

        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * ✅ FIXED: Get a specific practice session
   * ✅ NOW RETURNS CONSISTENT FORMAT: { success, data: { session, sessionId } }
   * This is critical for PracticeInterface to work correctly
   */
  static async getSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        console.log('❌ No user ID in request');
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!sessionId) {
        console.log('❌ No session ID provided');
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      console.log('📖 Fetching session:', sessionId, 'for user:', userId);

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          practiceAnswers: true
        }
      });

      if (!session) {
        console.log('❌ Session not found:', sessionId);
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      if (session.userId !== userId) {
        console.log('❌ User not authorized to view this session');
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this session'
        });
      }

      console.log('✅ Session found:', session.id);

      // ✅ CRITICAL FIX: Return consistent format with session object
      return res.json({
        success: true,
        data: {
          sessionId: session.id,  // ✅ Include sessionId at top level
          session: {
            id: session.id,
            name: session.name,
            type: session.type,
            status: session.status,
            questionCount: session.questionCount,
            duration: session.duration,
            score: session.score,
            correctAnswers: session.correctAnswers,
            totalQuestions: session.totalQuestions,
            startedAt: session.startedAt?.toISOString() || null,
            completedAt: session.completedAt?.toISOString() || null,
            pausedAt: session.pausedAt?.toISOString() || null,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString(),
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch session'
      });
    }
  }

  /**
   * Get all practice sessions for current user
   * GET /practice/sessions
   * ✅ FIXED: Consistent response format
   */
  static async getUserSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { limit = 10, offset = 0, status } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      const where: any = { userId };
      if (status) {
        where.status = (status as string).toUpperCase();
      }

      const [sessions, total] = await Promise.all([
        prisma.practiceSession.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string) || 10,
          skip: parseInt(offset as string) || 0,
          include: {
            _count: {
              select: { practiceAnswers: true }
            }
          }
        }),
        prisma.practiceSession.count({ where })
      ]);

      return res.json({
        success: true,
        data: sessions,
        pagination: {
          total,
          limit: parseInt(limit as string) || 10,
          offset: parseInt(offset as string) || 0
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching user sessions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch sessions'
      });
    }
  }

  /**
   * Get questions for a specific session
   * GET /practice/sessions/:sessionId/questions
   * ✅ FIXED: Returns array of questions with proper structure
   */
  static async getSessionQuestions(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      // Get session first to verify ownership
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          practiceAnswers: {
            select: { questionId: true }
          }
        }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this session'
        });
      }

      // Get questions
      const questions = await prisma.question.findMany({
        where: {
          id: { in: session.practiceAnswers.map(pa => pa.questionId) }
        },
        include: {
          options: {
            select: {
              id: true,
              label: true,
              content: true,
              isCorrect: false
            },
            orderBy: { label: 'asc' }
          },
          topic: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } }
        }
      });

      // Add numbering
      const numberedQuestions = questions.map((q, index) => ({
        ...q,
        questionNumber: index + 1,
        totalQuestions: questions.length
      }));

      console.log(`✅ Returning ${numberedQuestions.length} questions for session ${sessionId}`);

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: numberedQuestions
      });
    } catch (error: any) {
      console.error('❌ Error fetching session questions:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch questions'
      });
    }
  }

  /**
   * Submit single answer
   * POST /practice/sessions/:sessionId/submit-answer
   * ✅ FIXED: Consistent response format
   */
  static async submitAnswer(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { questionId, selectedAnswer } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      if (!sessionId || !questionId || selectedAnswer === undefined) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, questionId, and selectedAnswer are required'
        });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { options: true }
      });

      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      const correctOption = question.options.find(o => o.isCorrect);
      const isCorrect = correctOption?.label === selectedAnswer;

      const updated = await prisma.practiceAnswer.update({
        where: {
          sessionId_questionId: { sessionId, questionId }
        },
        data: {
          selectedAnswer,
          isCorrect
        }
      });

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: {
          questionId,
          selectedAnswer,
          isCorrect,
          correctAnswer: correctOption?.label,
          explanation: question.explanation
        }
      });
    } catch (error: any) {
      console.error('❌ Error submitting answer:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit answer'
      });
    }
  }

  /**
   * Submit multiple answers (batch)
   * POST /practice/sessions/:sessionId/answers
   * ✅ FIXED: Consistent response format
   */
  static async submitAnswers(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { answers } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      if (!sessionId || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          error: 'sessionId and answers array are required'
        });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const results = await Promise.allSettled(
        answers.map(async (answer: any) => {
          const { questionId, selectedAnswer, timeSpent } = answer;

          const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { options: true }
          });

          if (!question) {
            throw new Error(`Question ${questionId} not found`);
          }

          const correctOption = question.options.find(o => o.isCorrect);
          const isCorrect = correctOption?.label === selectedAnswer;

          return await prisma.practiceAnswer.update({
            where: {
              sessionId_questionId: { sessionId, questionId }
            },
            data: {
              selectedAnswer,
              isCorrect,
              timeSpent: timeSpent || undefined
            }
          });
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errors = results
        .map((r, i) => r.status === 'rejected' ? { index: i, error: (r as any).reason.message } : null)
        .filter(Boolean);

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: {
          processedCount: answers.length,
          successCount,
          errorCount: errors.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error: any) {
      console.error('❌ Error submitting answers:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit answers'
      });
    }
  }

  /**
   * Complete a practice session
   * POST /practice/sessions/:sessionId/complete
   * ✅ FIXED: Consistent response format
   */
  static async completeSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { timeSpent } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized'
        });
      }

      const answers = await prisma.practiceAnswer.findMany({
        where: { sessionId }
      });

      const correctAnswers = answers.filter(a => a.isCorrect).length;

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          correctAnswers,
          timeSpent
        }
      });

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: updated
      });
    } catch (error: any) {
      console.error('❌ Error completing session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete session'
      });
    }
  }

  /**
   * Get detailed results for a session
   * GET /practice/sessions/:sessionId/results
   * ✅ FIXED: Consistent response format
   */
  static async getSessionResults(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          practiceAnswers: {
            include: {
              question: {
                include: {
                  options: {
                    select: {
                      id: true,
                      label: true,
                      content: true,
                      isCorrect: true
                    }
                  },
                  subject: true
                }
              }
            }
          }
        }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this session'
        });
      }

      const answers = session.practiceAnswers.map(pa => ({
        questionId: pa.questionId,
        selectedAnswer: pa.selectedAnswer,
        isCorrect: pa.isCorrect,
        timeSpent: pa.timeSpent || 0,
        isFlagged: pa.isFlagged,
        question: {
          id: pa.question.id,
          content: pa.question.content,
          difficulty: pa.question.difficulty,
          explanation: pa.question.explanation,
          subject: pa.question.subject,
          options: pa.question.options
        }
      }));

      const totalQuestions = session.totalQuestions || answers.length;
      const correctAnswers =
        session.correctAnswers || answers.filter(a => a.isCorrect).length;
      const score =
        totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            name: session.name,
            type: session.type,
            status: session.status,
            score: parseFloat(score.toFixed(1)),
            totalQuestions,
            correctAnswers,
            wrongAnswers: totalQuestions - correctAnswers,
            timeSpent: session.timeSpent || 0,
            createdAt: session.createdAt,
            completedAt: session.completedAt
          },
          answers
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching session results:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch session results'
      });
    }
  }

  /**
   * Get detailed answer history for a session
   * GET /practice/sessions/:sessionId/history
   * ✅ FIXED: Consistent response format
   */
  static async getAnswerHistory(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized'
        });
      }

      const answers = await prisma.practiceAnswer.findMany({
        where: { sessionId },
        include: {
          question: {
            include: {
              options: true
            }
          }
        }
      });

      const flaggedQuestions = answers
        .filter(a => a.isFlagged)
        .map(a => a.questionId);

      const answersData = answers.map(a => {
        const correctOption = a.question.options.find(o => o.isCorrect);
        return {
          questionId: a.questionId,
          selectedAnswer: a.selectedAnswer,
          correctAnswer: correctOption?.label,
          isCorrect: a.isCorrect,
          explanation: a.question.explanation,
          isFlagged: a.isFlagged,
          timeSpent: a.timeSpent || 0
        };
      });

      const totalQuestions = answers.length;
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const attempted = answers.filter(a => a.selectedAnswer !== null).length;

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: {
          answers: answersData,
          flaggedQuestions,
          reviewSummary: {
            totalQuestions,
            attemptedQuestions: attempted,
            skippedQuestions: totalQuestions - attempted,
            correctAnswers,
            wrongAnswers: attempted - correctAnswers,
            accuracy: attempted > 0 ? (correctAnswers / attempted) * 100 : 0
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching answer history:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch answer history'
      });
    }
  }

  /**
   * Pause a session
   * PATCH /practice/sessions/:sessionId/pause
   * ✅ FIXED: Consistent response format
   */
  static async pauseSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'Session ID is required' });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date()
        }
      });

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: updated
      });
    } catch (error: any) {
      console.error('❌ Error pausing session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to pause session'
      });
    }
  }

  /**
   * Resume a session
   * PATCH /practice/sessions/:sessionId/resume
   * ✅ FIXED: Consistent response format
   */
  static async resumeSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'Session ID is required' });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          pausedAt: null
        }
      });

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: updated
      });
    } catch (error: any) {
      console.error('❌ Error resuming session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to resume session'
      });
    }
  }

  /**
   * Toggle flag on question
   * POST /practice/sessions/:sessionId/toggle-flag
   * ✅ FIXED: Consistent response format
   */
  static async toggleFlag(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { questionId, isFlagged } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      if (!sessionId || !questionId || isFlagged === undefined) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, questionId, and isFlagged are required'
        });
      }

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const updated = await prisma.practiceAnswer.update({
        where: {
          sessionId_questionId: { sessionId, questionId }
        },
        data: { isFlagged }
      });

      const flaggedCount = await prisma.practiceAnswer.count({
        where: { sessionId, isFlagged: true }
      });

      // ✅ CONSISTENT RESPONSE FORMAT
      return res.json({
        success: true,
        data: {
          questionId,
          isFlagged,
          totalFlagged: flaggedCount
        }
      });
    } catch (error: any) {
      console.error('❌ Error toggling flag:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle flag'
      });
    }
  }
}