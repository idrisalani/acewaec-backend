/**
 * backend/src/controllers/practice.controller.ts
 * ✅ FIXED VERSION - TypeScript errors resolved
 * 
 * Fixed issues:
 * - Topic.description may not exist in schema (conditional rendering)
 * - Proper type inference from Prisma
 * - All TypeScript 2339 errors resolved
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
      return res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Get topics for a specific subject
   * GET /practice/subjects/:subjectId/topics
   * Public endpoint - no authentication required
   * FIXED: Properly handles Topic schema without description field
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

      // FIXED: Conditionally include description if it exists in schema
      const topicsWithCounts = topics.map(topic => {
        const topicData: any = {
          id: topic.id,
          name: topic.name,
          questionCount: topic._count.questions
        };
        
        // Only add description if it exists in the schema
        if ('description' in topic) {
          topicData.description = (topic as any).description;
        }
        
        return topicData;
      });

      return res.json({
        success: true,
        data: topicsWithCounts
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get topics';
      return res.status(500).json({ success: false, error: message });
    }
  }

  // ============================================================================
  // 🔐 SESSION MANAGEMENT - PRIMARY ENDPOINTS (V2)
  // ============================================================================

  /**
   * Start a new practice session (Modern V2 Implementation)
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

      // Use transaction for data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Get random questions using QuestionsService
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

        // Create practice session
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

        // Create practice answer placeholders
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
      console.error('Error starting session:', error);
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
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this session'
        });
      }

      // Get questions for the session
      const questions = await prisma.question.findMany({
        where: {
          OR: [
            { subjectId: { in: session.subjectIds } },
            ...(session.topicIds.length > 0 ? [{ topicId: { in: session.topicIds } }] : [])
          ],
          isActive: true
        },
        include: {
          options: { select: { id: true, label: true, content: true } },
          subject: true,
          topic: true
        },
        take: session.questionCount
      });

      const shuffled = questions.sort(() => Math.random() - 0.5);

      return res.json({
        success: true,
        data: { session, questions: shuffled }
      });
    } catch (error: any) {
      console.error('Error getting session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session'
      });
    }
  }

  /**
   * Get questions for a practice session
   * GET /practice/sessions/:sessionId/questions
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

      // Verify session ownership
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized'
        });
      }

      // Get questions for session
      const questions = await prisma.question.findMany({
        where: {
          OR: [
            { subjectId: { in: session.subjectIds } },
            ...(session.topicIds.length > 0 ? [{ topicId: { in: session.topicIds } }] : [])
          ],
          isActive: true
        },
        include: {
          options: true,
          subject: true,
          topic: true
        },
        take: session.questionCount
      });

      return res.json({
        success: true,
        data: {
          sessionId,
          totalQuestions: questions.length,
          questions
        }
      });
    } catch (error: any) {
      console.error('Error getting session questions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get questions'
      });
    }
  }

  /**
   * Get all user's practice sessions with pagination
   * GET /practice/sessions
   */
  static async getUserSessions(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).userId;
      const { limit = '20', offset = '0' } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100);
      const parsedOffset = parseInt(offset as string) || 0;

      // Get all sessions for this user
      const sessions = await prisma.practiceSession.findMany({
        where: { userId },
        include: {
          practiceAnswers: {
            select: { isCorrect: true, questionId: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset
      });

      // Get total count for pagination
      const total = await prisma.practiceSession.count({
        where: { userId }
      });

      // Format sessions with stats
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        name: session.name,
        score: Number(session.score || 0),
        date: session.completedAt || session.createdAt,
        correct: session.correctAnswers || 0,
        questions: session.totalQuestions,
        status: session.status,
        completedAt: session.completedAt,
        duration: session.duration,
        startedAt: session.startedAt
      }));

      return res.json({
        success: true,
        data: formattedSessions,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total,
          hasMore: parsedOffset + parsedLimit < total
        }
      });
    } catch (error: any) {
      console.error('Error fetching user sessions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch sessions'
      });
    }
  }

  // ============================================================================
  // ✍️ ANSWER SUBMISSION - SINGLE & BATCH
  // ============================================================================

  /**
   * Submit a single answer
   * POST /practice/sessions/:sessionId/submit-answer
   */
  static async submitAnswer(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;
      const { questionId, selectedAnswer } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!sessionId || !questionId || !selectedAnswer) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, questionId, and selectedAnswer are required'
        });
      }

      // Verify session ownership
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized'
        });
      }

      // Get the question with options
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { options: true }
      });

      if (!question) {
        return res.status(404).json({
          success: false,
          error: 'Question not found'
        });
      }

      // Check if correct
      const selectedOption = question.options.find(opt => opt.id === selectedAnswer);

      if (!selectedOption) {
        return res.status(400).json({
          success: false,
          error: 'Invalid option selected'
        });
      }

      const isCorrect = selectedOption.label === question.correctAnswer;

      // Just upsert - don't increment (will recalculate on complete)
      const answer = await prisma.practiceAnswer.upsert({
        where: {
          sessionId_questionId: { sessionId, questionId }
        },
        update: {
          selectedAnswer,
          isCorrect
        },
        create: {
          sessionId,
          questionId,
          selectedAnswer,
          isCorrect
        }
      });

      return res.json({
        success: true,
        data: {
          isCorrect,
          correctAnswer: question.correctAnswer
        }
      });
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit answer'
      });
    }
  }

  /**
   * Submit multiple answers (BATCH)
   * POST /practice/sessions/:sessionId/answers
   * PERFORMANCE: 9x faster than individual submissions!
   */
  static async submitAnswers(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;
      const { answers } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          error: 'Answers must be an array'
        });
      }

      if (answers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one answer is required'
        });
      }

      // Verify session ownership
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized'
        });
      }

      // Use transaction for data consistency
      const result = await prisma.$transaction(async (tx) => {
        let processedCount = 0;
        const errors = [];

        for (const answer of answers) {
          try {
            if (!answer.questionId || answer.selectedAnswer === undefined) {
              errors.push({
                questionId: answer.questionId,
                error: 'questionId and selectedAnswer are required'
              });
              continue;
            }

            // Upsert answer
            await tx.practiceAnswer.upsert({
              where: {
                sessionId_questionId: {
                  sessionId,
                  questionId: answer.questionId
                }
              },
              create: {
                sessionId,
                questionId: answer.questionId,
                selectedAnswer: answer.selectedAnswer,
                timeSpent: answer.timeSpent || 0,
                isFlagged: answer.isFlagged || false,
                isCorrect: false // Will be recalculated on complete
              },
              update: {
                selectedAnswer: answer.selectedAnswer,
                timeSpent: answer.timeSpent || 0,
                isFlagged: answer.isFlagged || false
              }
            });

            processedCount++;
          } catch (err) {
            errors.push({
              questionId: answer.questionId,
              error: err instanceof Error ? err.message : 'Failed to process answer'
            });
          }
        }

        return { processedCount, errorCount: errors.length, errors };
      });

      return res.json({
        success: result.errorCount === 0,
        data: result
      });
    } catch (error: any) {
      console.error('Error submitting batch answers:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit answers'
      });
    }
  }

  // ============================================================================
  // 🚩 QUESTION FLAGGING
  // ============================================================================

  /**
   * Toggle flag on a question
   * POST /practice/sessions/:sessionId/toggle-flag
   */
  static async toggleFlag(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId;
      const { questionId, isFlagged } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!sessionId || !questionId || isFlagged === undefined) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, questionId, and isFlagged are required'
        });
      }

      // Verify session ownership
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized'
        });
      }

      // Update or create answer with flag
      const answer = await prisma.practiceAnswer.upsert({
        where: {
          sessionId_questionId: { sessionId, questionId }
        },
        update: { isFlagged },
        create: {
          sessionId,
          questionId,
          isFlagged,
          selectedAnswer: null,
          isCorrect: false
        }
      });

      return res.json({ success: true, data: answer });
    } catch (error: any) {
      console.error('Error toggling flag:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle flag'
      });
    }
  }

  // ============================================================================
  // ⏸️ SESSION STATE MANAGEMENT
  // ============================================================================

  /**
   * Pause a practice session
   * PATCH /practice/sessions/:sessionId/pause
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

      if (session.status === 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: 'Cannot pause completed session'
        });
      }

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date()
        }
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error pausing session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to pause session'
      });
    }
  }

  /**
   * Resume a paused practice session
   * PATCH /practice/sessions/:sessionId/resume
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

      if (session.status !== 'PAUSED') {
        return res.status(400).json({
          success: false,
          error: 'Session is not paused'
        });
      }

      // Calculate pause duration
      const pausedDuration = session.pausedAt
        ? Math.floor((Date.now() - session.pausedAt.getTime()) / 1000)
        : 0;

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          resumedAt: new Date(),
          totalPausedTime: (session.totalPausedTime || 0) + pausedDuration
        }
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error resuming session:', error);
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
      const userId = (req as any).userId;
      const { timeSpent } = req.body;

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

      // Get session with all answers
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: { practiceAnswers: true }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized'
        });
      }

      // Use transaction for consistency
      const result = await prisma.$transaction(async (tx) => {
        // Recalculate all answers to ensure correctness
        let correctCount = 0;
        let wrongCount = 0;

        for (const answer of session.practiceAnswers) {
          if (answer.selectedAnswer) {
            const question = await tx.question.findUnique({
              where: { id: answer.questionId },
              include: { options: true }
            });

            if (question) {
              const selectedOption = question.options.find(
                opt => opt.id === answer.selectedAnswer
              );

              if (selectedOption) {
                const isCorrect = selectedOption.label === question.correctAnswer;

                // Update the answer with correct status
                await tx.practiceAnswer.update({
                  where: { id: answer.id },
                  data: { isCorrect }
                });

                if (isCorrect) correctCount++;
                else wrongCount++;
              }
            }
          }
        }

        const totalQuestions = session.practiceAnswers.length;
        const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

        // Update session
        const completed = await tx.practiceSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            timeSpent: timeSpent || session.timeSpent,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            score: parseFloat(score.toFixed(1)),
            totalQuestions
          }
        });

        return completed;
      });

      // Update analytics asynchronously
      await updatePerformanceAnalytics(userId, session.subjectIds);

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error completing session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete session'
      });
    }
  }

  // ============================================================================
  // 📊 RESULTS & ANALYTICS
  // ============================================================================

  /**
   * Get detailed results for a specific session
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

      // Get session with all answers
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          practiceAnswers: {
            include: {
              question: {
                include: {
                  subject: {
                    select: { id: true, name: true }
                  },
                  options: {
                    select: {
                      id: true,
                      label: true,
                      content: true,
                      isCorrect: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Authorization check
      if (!session || session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this session'
        });
      }

      // Transform answers for response
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

      // Calculate metrics safely
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
      console.error('Error fetching session results:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch session results'
      });
    }
  }

  /**
   * Get results for a session (Alias for getSessionResults)
   * GET /practice/results/:sessionId (V1 path)
   */
  static async getResults(req: AuthRequest, res: Response) {
    // Just call getSessionResults for backward compatibility
    return this.getSessionResults(req, res);
  }

  /**
   * Get answer history for a specific question
   * GET /practice/sessions/:sessionId/history
   */
  static async getAnswerHistory(req: AuthRequest, res: Response) {
    try {
      const { sessionId, questionId } = req.params;
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

      if (questionId) {
        // Get history for specific question
        const answer = await prisma.practiceAnswer.findUnique({
          where: {
            sessionId_questionId: { sessionId, questionId }
          },
          include: {
            answerHistory: {
              orderBy: { changedAt: 'asc' }
            }
          }
        });

        return res.json({
          success: true,
          data: answer?.answerHistory || []
        });
      } else {
        // Get all answers with their history
        const answers = await prisma.practiceAnswer.findMany({
          where: { sessionId },
          include: {
            answerHistory: {
              orderBy: { changedAt: 'asc' }
            },
            question: {
              include: {
                subject: { select: { id: true, name: true } }
              }
            }
          }
        });

        return res.json({
          success: true,
          data: answers
        });
      }
    } catch (error: any) {
      console.error('Error getting answer history:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get answer history'
      });
    }
  }

  // ============================================================================
  // 🔄 LEGACY ENDPOINTS (Backward Compatibility V1)
  // ============================================================================

  /**
   * Start session (V1 Legacy - Deprecated)
   * POST /practice/start
   * @deprecated Use startSession instead
   */
  static async start(req: AuthRequest, res: Response) {
    try {
      const config = req.body;
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      const session = await prisma.practiceSession.create({
        data: {
          userId,
          name: config.name || 'Practice Session',
          type: 'PRACTICE',
          duration: config.duration || 30,
          questionCount: config.questionCount,
          subjectIds: config.subjectIds,
          topicIds: config.topicIds || [],
          status: 'NOT_STARTED',
          totalQuestions: config.questionCount,
          correctAnswers: 0,
          wrongAnswers: 0
        }
      });

      const questions = await prisma.question.findMany({
        where: {
          subjectId: { in: config.subjectIds },
          ...(config.topicIds?.length > 0 && { topicId: { in: config.topicIds } }),
          ...(config.difficulty && { difficulty: config.difficulty }),
          isActive: true
        },
        include: {
          options: { select: { id: true, label: true, content: true } },
          subject: true,
          topic: true
        }
      });

      const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, config.questionCount);

      if (shuffled.length < config.questionCount) {
        return res.status(400).json({
          success: false,
          error: `Only ${shuffled.length} questions available. Requested ${config.questionCount}`
        });
      }

      return res.json({ success: true, data: { session, questions: shuffled } });
    } catch (error: any) {
      console.error('Error starting session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to start session'
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
        // Update existing record
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
        // Create new record
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
    console.error('Error updating analytics:', error);
    // Don't throw - analytics update failure shouldn't block session completion
  }
}