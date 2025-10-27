/**
 * backend/src/controllers/practice.controller.ts
 * ✅ COMPLETE VERSION - All methods implemented
 * 
 * Fixed issues:
 * - Added missing getUserSessions method
 * - Added missing getSessionQuestions method
 * - Added missing getAnswerHistory method
 * - Added missing getResults method
 * - Added deduplication in getTopicsForSubject
 * - Better error handling and logging
 */

import { Response, NextFunction } from 'express';
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
   * Public endpoint - no authentication required
   */
  static async getSubjects(req: AuthRequest, res: Response) {
    try {
      const { category } = req.query;

      const where = category
        ? { categories: { has: category as string }, isActive: true }
        : { isActive: true };

      const subjects = await prisma.subject.findMany({
        where,
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      const subjectsWithCounts = subjects.map(subject => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description,
        categories: subject.categories,
        isActive: subject.isActive,
        questionCount: subject._count.questions,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt
      }));

      return res.json({ success: true, data: subjectsWithCounts });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get subjects';
      console.error('❌ Error in getSubjects:', message);
      return res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Get topics for a specific subject
   * GET /practice/subjects/:subjectId/topics
   * Public endpoint - no authentication required
   * 
   * ✅ FIXED:
   * - Added deduplication to prevent duplicate topics in response
   * - Better error handling
   * - Improved logging for debugging
   */
  static async getTopicsForSubject(req: AuthRequest, res: Response) {
    try {
      const { subjectId } = req.params;

      if (!subjectId) {
        console.warn('⚠️ getTopicsForSubject called without subjectId');
        return res.status(400).json({
          success: false,
          error: 'Subject ID is required'
        });
      }

      console.log(`🔍 Fetching topics for subject: ${subjectId}`);

      // ✅ Query topics from database
      const topics = await prisma.topic.findMany({
        where: {
          subjectId,
          isActive: true
        },
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      console.log(`📊 Database returned ${topics.length} topic records for subject ${subjectId}`);

      // ✅ DEDUPLICATION: Handle case where database has duplicate records
      const uniqueTopicsMap = new Map<string, any>();
      const duplicatesFound: string[] = [];

      topics.forEach(topic => {
        if (!uniqueTopicsMap.has(topic.id)) {
          uniqueTopicsMap.set(topic.id, {
            id: topic.id,
            name: topic.name,
            _count: {
              questions: topic._count.questions
            }
          });
        } else {
          duplicatesFound.push(`${topic.name} (ID: ${topic.id})`);
        }
      });

      if (duplicatesFound.length > 0) {
        console.warn(`⚠️ Found ${duplicatesFound.length} duplicate topics:`, duplicatesFound);
      }

      const uniqueTopics = Array.from(uniqueTopicsMap.values());
      uniqueTopics.sort((a, b) => a.name.localeCompare(b.name));

      console.log(`✅ After deduplication: ${uniqueTopics.length} unique topics for subject ${subjectId}`);

      return res.json({
        success: true,
        data: uniqueTopics
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get topics';
      console.error(`❌ Error in getTopicsForSubject for subject ${req.params.subjectId}:`, message);
      return res.status(500).json({ success: false, error: message });
    }
  }

  // ============================================================================
  // 🔐 SESSION MANAGEMENT - PRIMARY ENDPOINTS
  // ============================================================================

  /**
   * Start a new practice session
   * POST /practice/sessions
   */
  static async startSession(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).userId;
      const {
        name,
        questionCount,
        subjectIds,
        topicIds,
        difficulty,
        duration,
        category,
        type = 'PRACTICE'
      } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!questionCount || !subjectIds || subjectIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'questionCount and subjectIds are required'
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const questionResult = await QuestionsService.getRandomQuestions({
          count: questionCount,
          subjectIds,
          topicIds,
          difficulty,
          category,
          excludeIds: []
        });

        if (questionResult.questions.length === 0) {
          throw new Error('No questions found matching the criteria');
        }

        const session = await tx.practiceSession.create({
          data: {
            userId,
            name: name || 'Practice Session',
            type: type || 'PRACTICE',
            status: 'IN_PROGRESS',
            duration: duration || null,
            questionCount: questionResult.questions.length,
            subjectIds: subjectIds || [],
            topicIds: topicIds || [],
            difficulty: difficulty || null,
            totalQuestions: questionResult.questions.length,
            startedAt: new Date()
          }
        });

        await tx.practiceAnswer.createMany({
          data: questionResult.questions.map((q: any) => ({
            sessionId: session.id,
            questionId: q.id,
            selectedAnswer: null,
            isCorrect: false,
            isFlagged: false
          }))
        });

        return {
          session,
          questions: questionResult.questions,
          totalAvailable: questionResult.totalAvailable
        };
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('❌ Error starting session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to start session'
      });
    }
  }

  /**
   * Get a specific practice session
   * GET /practice/sessions/:sessionId
   */
  static async getSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;

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
          practiceAnswers: true
        }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this session'
        });
      }

      return res.json({
        success: true,
        data: session
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
   * ✅ NEW METHOD - Was missing
   */
  static async getUserSessions(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).userId;
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
        total,
        limit: parseInt(limit as string) || 10,
        offset: parseInt(offset as string) || 0
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
   * Get all questions for a practice session
   * GET /practice/sessions/:sessionId/questions
   * ✅ NEW METHOD - Was missing
   */
  static async getSessionQuestions(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;

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

      // Verify user owns this session
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view these questions'
        });
      }

      const answers = await prisma.practiceAnswer.findMany({
        where: { sessionId },
        include: {
          question: {
            include: {
              options: true,
              subject: true,
              topic: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const questions = answers.map(answer => ({
        id: answer.question.id,
        content: answer.question.content,
        difficulty: answer.question.difficulty,
        subject: answer.question.subject,
        topic: answer.question.topic,
        options: answer.question.options,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        isFlagged: answer.isFlagged,
        timeSpent: answer.timeSpent
      }));

      return res.json({
        success: true,
        data: {
          questions,
          totalCount: questions.length
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching session questions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch questions'
      });
    }
  }

  /**
   * Submit single answer
   * POST /practice/sessions/:sessionId/submit-answer
   */
  static async submitAnswer(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { questionId, selectedAnswer } = req.body;
      const userId = (req as any).userId;

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
        },
        include: { question: { include: { options: true } } }
      });

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
   */
  static async submitAnswers(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { answers } = req.body;
      const userId = (req as any).userId;

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
   * Toggle flag on a question
   * POST /practice/sessions/:sessionId/toggle-flag
   */
  static async toggleFlag(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { questionId, isFlagged } = req.body;
      const userId = (req as any).userId;

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

  /**
   * Pause a practice session
   * PATCH /practice/sessions/:sessionId/pause
   * POST /practice/sessions/:sessionId/pause (deprecated)
   */
  static async pauseSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;

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

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: { status: 'PAUSED' }
      });

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
   * Resume a paused practice session
   * PATCH /practice/sessions/:sessionId/resume
   * POST /practice/sessions/:sessionId/resume (deprecated)
   */
  static async resumeSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;

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

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: { status: 'IN_PROGRESS' }
      });

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
   * Complete a practice session
   * POST /practice/sessions/:sessionId/complete
   */
  static async completeSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { timeSpent } = req.body;
      const userId = (req as any).userId;

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
   */
  static async getSessionResults(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;

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
   * ✅ NEW METHOD - Was missing
   */
  static async getAnswerHistory(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;

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
   * Get all results for a user
   * GET /practice/user/results
   * ✅ NEW METHOD - Was missing (legacy endpoint)
   */
  static async getResults(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      const sessions = await prisma.practiceSession.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        include: {
          practiceAnswers: true
        },
        orderBy: { completedAt: 'desc' }
      });

      const results = sessions.map(session => {
        const totalQuestions = session.totalQuestions || session.practiceAnswers.length;
        const correctAnswers = session.correctAnswers || 
          session.practiceAnswers.filter(a => a.isCorrect).length;
        const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        return {
          sessionId: session.id,
          name: session.name,
          type: session.type,
          score: parseFloat(score.toFixed(1)),
          totalQuestions,
          correctAnswers,
          wrongAnswers: totalQuestions - correctAnswers,
          timeSpent: session.timeSpent || 0,
          completedAt: session.completedAt
        };
      });

      return res.json({
        success: true,
        data: {
          results,
          total: results.length
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching results:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch results'
      });
    }
  }
}

/**
 * Helper function to update performance analytics
 */
async function updatePerformanceAnalytics(userId: string, subjectIds: string[]) {
  try {
    for (const subjectId of subjectIds) {
      const existing = await prisma.performanceAnalytics.findUnique({
        where: {
          userId_subjectId_topicId: {
            userId,
            subjectId,
            topicId: null
          }
        }
      });

      if (existing) {
        await prisma.performanceAnalytics.update({
          where: {
            userId_subjectId_topicId: {
              userId,
              subjectId,
              topicId: null
            }
          },
          data: {
            lastPracticed: new Date()
          }
        });
      } else {
        await prisma.performanceAnalytics.create({
          data: {
            userId,
            subjectId,
            lastPracticed: new Date()
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Error updating analytics:', error);
  }
}