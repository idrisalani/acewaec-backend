import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PracticeService } from '../services/practice.service';
import { AuthRequest } from '../types/index';
import { QuestionsService } from '../services/questions.service';
import { AnalyticsService } from '../services/analytics.service';

const prisma = new PrismaClient();

export class PracticeController {
  static async startSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!; // CHANGED: Use req.userId instead of req.user!.userId
      const {
        name,
        questionCount,
        subjectIds,
        topicIds,
        difficulty,
        duration,
        category
      } = req.body;

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
        res.status(404).json({
          success: false,
          error: 'No questions found matching the criteria'
        });
        return;
      }

      // Create practice session
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          name: name || 'Practice Session',
          type: 'PRACTICE',
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

      // Create practice answers (placeholders)
      await prisma.practiceAnswer.createMany({
        data: questionResult.questions.map((q: any) => ({
          sessionId: session.id,
          questionId: q.id,
          selectedAnswer: null,
          isCorrect: false,
          isFlagged: false
        }))
      });

      res.json({
        success: true,
        data: {
          session,
          questions: questionResult.questions,
          totalAvailable: questionResult.totalAvailable
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async start(req: AuthRequest, res: Response) {
    try {
      const config = req.body;

      const session = await prisma.practiceSession.create({
        data: {
          userId: req.userId!,
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

      res.json({ success: true, data: { session, questions: shuffled } });
    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({ success: false, error: 'Failed to start session' });
    }
  }

  static async getSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      // Get questions for the session
      const questions = await prisma.question.findMany({
        where: {
          subjectId: { in: session.subjectIds },
          ...(session.topicIds.length > 0 && { topicId: { in: session.topicIds } }),
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

      res.json({ success: true, data: { session, questions: shuffled } });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ success: false, error: 'Failed to get session' });
    }
  }

  static async submitAnswer(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { questionId, selectedAnswer } = req.body;

      // Get the question with options
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { options: true }
      });

      if (!question) {
        res.status(404).json({ success: false, error: 'Question not found' });
        return;
      }

      // FIX: Find the selected option and check if it's correct
      const selectedOption = question.options.find(opt => opt.id === selectedAnswer);

      if (!selectedOption) {
        res.status(400).json({ success: false, error: 'Invalid option selected' });
        return;
      }

      // Check if correct by comparing the option's label to the correctAnswer
      const isCorrect = selectedOption.label === question.correctAnswer;

      // Update or create the practice answer
      const answer = await prisma.practiceAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId,
            questionId
          }
        },
        update: {
          selectedAnswer,
          isCorrect // Use the calculated isCorrect value
        },
        create: {
          sessionId,
          questionId,
          selectedAnswer,
          isCorrect // Use the calculated isCorrect value
        }
      });

      // Update session statistics
      await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          correctAnswers: {
            increment: isCorrect ? 1 : 0
          },
          wrongAnswers: {
            increment: isCorrect ? 0 : 1
          }
        }
      });

      res.json({
        success: true,
        data: {
          isCorrect,
          correctAnswer: question.correctAnswer
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async completeSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      // Get all answers for this session
      const answers = await prisma.practiceAnswer.findMany({
        where: { sessionId },
        include: {
          question: {
            include: { options: true }
          }
        }
      });

      // Recalculate all answers to ensure correctness
      let correctCount = 0;
      let wrongCount = 0;

      for (const answer of answers) {
        if (answer.selectedAnswer) {
          const selectedOption = answer.question.options.find(
            opt => opt.id === answer.selectedAnswer
          );

          if (selectedOption) {
            const isCorrect = selectedOption.label === answer.question.correctAnswer;

            // Update the answer with correct status
            await prisma.practiceAnswer.update({
              where: { id: answer.id },
              data: { isCorrect }
            });

            if (isCorrect) {
              correctCount++;
            } else {
              wrongCount++;
            }
          }
        }
      }

      const totalQuestions = answers.length;
      const score = totalQuestions > 0
        ? ((correctCount / totalQuestions) * 100).toFixed(2)
        : '0.00';

      // Update session
      const session = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          score: parseFloat(score)
        }
      });

      try {
        await AnalyticsService.updateAnalytics(sessionId, req.userId!);
        console.log('✅ Analytics updated for session:', sessionId);
      } catch (analyticsError: any) {
        console.error('⚠️ Failed to update analytics:', analyticsError.message);
      }

      res.json({
        success: true,
        data: { session }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getSubjectsForPractice(req: AuthRequest, res: Response) {
    try {
      const { category } = req.query;

      let selectedCategory: string;

      if (category && ['SCIENCE', 'ART', 'COMMERCIAL'].includes(category as string)) {
        selectedCategory = category as string;
      } else if (req.userId) {
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { studentCategory: true }
        });
        selectedCategory = user?.studentCategory || 'SCIENCE';
      } else {
        selectedCategory = 'SCIENCE';
      }

      console.log('📚 Fetching subjects for category:', selectedCategory);

      // Get all active subjects with their question counts
      const allSubjects = await prisma.subject.findMany({
        where: {
          isActive: true
        },
        include: {
          _count: {
            select: {
              questions: true // Get total count first
            }
          }
        }
      });

      // For each subject, count questions in the selected category
      const subjectsWithCategoryCounts = await Promise.all(
        allSubjects.map(async (subject) => {
          const questionCount = await prisma.question.count({
            where: {
              subjectId: subject.id,
              category: selectedCategory as any,
              isActive: true
            }
          });

          return {
            ...subject,
            questionCount
          };
        })
      );

      // Filter out subjects with 0 questions in this category
      const subjectsWithQuestions = subjectsWithCategoryCounts.filter(
        subject => subject.questionCount > 0
      );

      console.log(`✅ Found ${subjectsWithQuestions.length} subjects with questions`);

      res.json({
        success: true,
        data: subjectsWithQuestions.map(subject => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          category: selectedCategory,
          questionCount: subject.questionCount,
          isActive: subject.isActive
        }))
      });
    } catch (error) {
      console.error('❌ Error fetching subjects:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch subjects';
      res.status(500).json({ success: false, error: message });
    }
  }

  // Add this FIXED getSessionResults method to your practice.controller.ts

  static async getSessionResults(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

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
                  subject: {
                    select: {
                      id: true,
                      name: true,
                      code: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      // ✅ FIXED: Map practiceAnswers to answers with correct structure
      const answers = session.practiceAnswers.map(answer => ({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
        isFlagged: answer.isFlagged || false,
        question: answer.question
      }));

      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            score: Number(session.score || 0),
            totalQuestions: session.totalQuestions,
            correctAnswers: session.correctAnswers,
            timeSpent: session.timeSpent || 0
          },
          answers  // ✅ FIXED: Changed from 'questions' to 'answers'
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get results';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async getSessionQuestions(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          practiceAnswers: {
            include: {
              question: {
                include: {
                  subject: true,
                  topic: true,
                  options: {
                    select: {
                      id: true,
                      label: true,
                      content: true,
                      // Do NOT include isCorrect for security
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      // Extract questions without correct answer flags
      const questions = session.practiceAnswers.map(answer => answer.question);

      res.json({
        success: true,
        data: {
          session,
          questions
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get questions';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async getTopicsForSubject(req: AuthRequest, res: Response) {
    try {
      const { subjectId } = req.params;

      const topics = await prisma.topic.findMany({
        where: {
          subjectId,
          isActive: true,
        },
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({ success: true, data: topics });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch topics';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async toggleFlag(req: AuthRequest, res: Response) {
    try {
      const { sessionId, questionId } = req.params;
      const { isFlagged } = req.body;

      // Verify session ownership
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      // Update or create answer with flag
      const answer = await prisma.practiceAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId,
            questionId
          }
        },
        update: {
          isFlagged
        },
        create: {
          sessionId,
          questionId,
          isFlagged,
          selectedAnswer: null,
          isCorrect: false
        }
      });

      res.json({ success: true, data: answer });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle flag';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async pauseSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      if (session.status === 'COMPLETED') {
        return res.status(400).json({ success: false, error: 'Cannot pause completed session' });
      }

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date()
        }
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pause session';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async resumeSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      if (session.status !== 'PAUSED') {
        return res.status(400).json({ success: false, error: 'Session is not paused' });
      }

      // Calculate paused duration
      const pausedDuration = session.pausedAt
        ? Math.floor((Date.now() - session.pausedAt.getTime()) / 1000)
        : 0;

      const updated = await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS', // CHANGED FROM 'ACTIVE'
          resumedAt: new Date(),
          totalPausedTime: session.totalPausedTime + pausedDuration
        }
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resume session';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async getAnswerHistory(req: AuthRequest, res: Response) {
    try {
      const { sessionId, questionId } = req.params;

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const answer = await prisma.practiceAnswer.findUnique({
        where: {
          sessionId_questionId: {
            sessionId,
            questionId
          }
        },
        include: {
          answerHistory: {
            orderBy: { changedAt: 'asc' }
          }
        }
      });

      res.json({ success: true, data: answer?.answerHistory || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get answer history';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async getResults(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          practiceAnswers: {
            include: {
              question: {
                include: {
                  subject: true,
                  options: true
                }
              }
            }
          }
        }
      });

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const answers = session.practiceAnswers.map(answer => ({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
        isFlagged: answer.isFlagged || false,
        question: answer.question
      }));

      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            score: Number(session.score || 0),
            totalQuestions: session.totalQuestions,
            correctAnswers: session.correctAnswers,
            timeSpent: session.timeSpent || 0
          },
          answers
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get results';
      res.status(500).json({ success: false, error: message });
    }
  }

  // In practice.controller.ts
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
            select: { questions: true }  // Count questions per subject
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Add question count to response
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

      res.json({ success: true, data: subjectsWithCounts });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get subjects';
      res.status(500).json({ success: false, error: message });
    }
  }
}