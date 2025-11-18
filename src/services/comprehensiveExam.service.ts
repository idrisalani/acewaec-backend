// backend/src/services/comprehensiveExam.service.ts
// ✅ COMPLETE - All methods implemented with proper error handling

import { PrismaClient, ExamStatus, DayStatus, SessionStatus, SessionType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Comprehensive Exam Service
 * Handles all exam-related business logic for mock examinations
 */
export class ComprehensiveExamService {
  /**
   * Create a new comprehensive exam
   * @param userId - The student's user ID
   * @param subjectIds - Array of 7 subject IDs (one per day)
   * @returns Created exam with exam days
   */
  static async createExam(
    userId: string,
    subjectIds: string[]
  ): Promise<any> {
    try {
      // Validate exactly 7 subjects
      if (!subjectIds || subjectIds.length !== 7) {
        throw new Error('Must select exactly 7 subjects (one per day)');
      }

      // Verify all subjects exist
      const subjects = await prisma.subject.findMany({
        where: {
          id: {
            in: subjectIds,
          },
        },
      });

      if (subjects.length !== 7) {
        throw new Error('One or more subjects not found');
      }

      // Create the exam
      const exam = await prisma.comprehensiveExam.create({
        data: {
          userId,
          name: `WAEC Mock Examination - ${new Date().toLocaleDateString()}`,
          status: ExamStatus.NOT_STARTED,
          subjects: subjectIds,
          questionsPerSubject: 40,
          durationPerDay: 180, // 3 hours in minutes
          startDate: new Date(),
          currentDay: 1,
          totalDays: 7,
          totalQuestions: 280, // 7 subjects × 40 questions
        },
        include: {
          examDays: true,
        },
      });

      // Create exam days for each subject
      const examDays = await Promise.all(
        subjectIds.map((subjectId, index) =>
          prisma.examDay.create({
            data: {
              examId: exam.id,
              dayNumber: index + 1,
              subjectId,
              status: index === 0 ? DayStatus.AVAILABLE : DayStatus.LOCKED,
            },
            include: {
              subject: true,
            },
          })
        )
      );

      return {
        ...exam,
        examDays,
      };
    } catch (error) {
      throw new Error(
        `Failed to create exam: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all exams for a user
   * @param userId - The student's user ID
   * @returns Array of exams with basic details
   */
  static async getUserExams(userId: string): Promise<any[]> {
    try {
      const exams = await prisma.comprehensiveExam.findMany({
        where: { userId },
        include: {
          examDays: {
            include: {
              subject: true,
            },
            orderBy: {
              dayNumber: 'asc',
            },
          },
          subjectResults: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return exams;
    } catch (error) {
      throw new Error(
        `Failed to fetch exams: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a specific exam with all details
   * @param examId - The exam ID
   * @param userId - The user ID (for authorization)
   * @returns Exam with all details
   */
  static async getExam(examId: string, userId: string): Promise<any> {
    try {
      const exam = await prisma.comprehensiveExam.findUnique({
        where: { id: examId },
        include: {
          examDays: {
            include: {
              subject: true,
              session: {
                include: {
                  practiceAnswers: {
                    include: {
                      question: {
                        include: {
                          options: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              dayNumber: 'asc',
            },
          },
          subjectResults: {
            include: {
              subject: true,
            },
          },
        },
      });

      if (!exam) {
        throw new Error('Exam not found');
      }

      // Verify ownership
      if (exam.userId !== userId) {
        throw new Error('Unauthorized access to this exam');
      }

      return exam;
    } catch (error) {
      throw new Error(
        `Failed to fetch exam: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Start an exam day
   * @param examId - The exam ID
   * @param dayNumber - The day number (1-7)
   * @param userId - The user ID
   * @returns Practice session and exam day details
   */
  static async startDay(
    examId: string,
    dayNumber: number,
    userId: string
  ): Promise<any> {
    try {
      // Validate day number
      if (dayNumber < 1 || dayNumber > 7) {
        throw new Error('Invalid day number. Must be between 1 and 7');
      }

      // Get the exam
      const exam = await prisma.comprehensiveExam.findUnique({
        where: { id: examId },
        include: {
          examDays: {
            include: {
              subject: true,
            },
            orderBy: {
              dayNumber: 'asc',
            },
          },
        },
      });

      if (!exam || exam.userId !== userId) {
        throw new Error('Exam not found or unauthorized');
      }

      // Get the exam day
      const examDay = exam.examDays.find((day) => day.dayNumber === dayNumber);
      if (!examDay) {
        throw new Error(`Exam day ${dayNumber} not found`);
      }

      // Check if day is available or already completed
      if (examDay.status === DayStatus.LOCKED) {
        throw new Error(
          `Day ${dayNumber} is locked. Complete previous days first`
        );
      }

      if (examDay.status === DayStatus.COMPLETED) {
        throw new Error(`Day ${dayNumber} is already completed`);
      }

      // Fetch questions for this subject
      const questions = await prisma.question.findMany({
        where: {
          subjectId: examDay.subjectId,
          isActive: true,
        },
        include: {
          options: true,
        },
        take: exam.questionsPerSubject,
      });

      if (questions.length === 0) {
        throw new Error(`No questions found for day ${dayNumber}`);
      }

      // Create a practice session for this exam day
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          name: `WAEC Mock - Day ${dayNumber}: ${examDay.subject.name}`,
          type: SessionType.COMPREHENSIVE,
          status: SessionStatus.IN_PROGRESS,
          duration: exam.durationPerDay,
          questionCount: questions.length,
          subjectIds: [examDay.subjectId],
          totalQuestions: questions.length,
          startedAt: new Date(),
        },
        include: {
          practiceAnswers: true,
        },
      });

      // Update exam day status
      await prisma.examDay.update({
        where: { id: examDay.id },
        data: {
          status: DayStatus.IN_PROGRESS,
          sessionId: session.id,
          startedAt: new Date(),
        },
      });

      // Update exam status
      await prisma.comprehensiveExam.update({
        where: { id: examId },
        data: {
          status: ExamStatus.IN_PROGRESS,
          currentDay: dayNumber,
        },
      });

      return {
        session,
        examDay: {
          ...examDay,
          status: DayStatus.IN_PROGRESS,
        },
        questions,
        totalQuestions: questions.length,
        durationInMinutes: exam.durationPerDay,
      };
    } catch (error) {
      throw new Error(
        `Failed to start exam day: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Complete an exam day and calculate results
   * @param examId - The exam ID
   * @param dayNumber - The day number
   * @param sessionId - The session ID
   * @param userId - The user ID
   * @returns Day results and next day status
   */
  static async completeDay(
    examId: string,
    dayNumber: number,
    sessionId: string,
    userId: string
  ): Promise<any> {
    try {
      // Get the exam and session
      const [exam, session] = await Promise.all([
        prisma.comprehensiveExam.findUnique({
          where: { id: examId },
          include: {
            examDays: {
              include: {
                subject: true,
              },
              orderBy: {
                dayNumber: 'asc',
              },
            },
          },
        }),
        prisma.practiceSession.findUnique({
          where: { id: sessionId },
          include: {
            practiceAnswers: {
              include: {
                question: true,
              },
            },
          },
        }),
      ]);

      if (!exam || exam.userId !== userId) {
        throw new Error('Exam not found or unauthorized');
      }

      if (!session) {
        throw new Error('Session not found');
      }

      // Get the exam day
      const examDay = exam.examDays.find((day) => day.dayNumber === dayNumber);
      if (!examDay) {
        throw new Error(`Exam day ${dayNumber} not found`);
      }

      // Calculate results
      const correctAnswers = session.practiceAnswers.filter(
        (answer) => answer.isCorrect
      ).length;

      const totalQuestions = session.practiceAnswers.length;
      const accuracy =
        totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      // Update session
      await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completedAt: new Date(),
          totalQuestions,
          correctAnswers,
          wrongAnswers: totalQuestions - correctAnswers,
          score: new Prisma.Decimal(accuracy.toFixed(2)),
        },
      });

      // Update exam day
      const updatedExamDay = await prisma.examDay.update({
        where: { id: examDay.id },
        data: {
          status: DayStatus.COMPLETED,
          completedAt: new Date(),
          totalQuestions,
          correctAnswers,
          score: new Prisma.Decimal(accuracy.toFixed(2)),
        },
        include: {
          subject: true,
        },
      });

      // Create subject result
      const subjectResult = await prisma.subjectResult.create({
        data: {
          examId,
          subjectId: examDay.subjectId,
          totalQuestions,
          correctAnswers,
          score: new Prisma.Decimal(accuracy.toFixed(2)),
          grade: this.calculateGrade(accuracy),
          timeTaken: session.totalPausedTime + (new Date().getTime() - session.startedAt.getTime()),
          answers: session.practiceAnswers.map((answer) => ({
            questionId: answer.questionId,
            selectedAnswer: answer.selectedAnswer,
            isCorrect: answer.isCorrect,
          })),
        },
        include: {
          subject: true,
        },
      });

      // Unlock next day if exists
      let nextDay = null;
      if (dayNumber < 7) {
        nextDay = await prisma.examDay.update({
          where: {
            examId_dayNumber: {
              examId,
              dayNumber: dayNumber + 1,
            },
          },
          data: {
            status: DayStatus.AVAILABLE,
          },
          include: {
            subject: true,
          },
        });
      } else {
        // All days completed - mark exam as complete
        await prisma.comprehensiveExam.update({
          where: { id: examId },
          data: {
            status: ExamStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      // Calculate cumulative exam stats
      const allResults = await prisma.subjectResult.findMany({
        where: { examId },
      });

      const cumulativeCorrect = allResults.reduce(
        (sum, result) => sum + result.correctAnswers,
        0
      );
      const cumulativeTotal = allResults.reduce(
        (sum, result) => sum + result.totalQuestions,
        0
      );
      const overallScore =
        cumulativeTotal > 0 ? (cumulativeCorrect / cumulativeTotal) * 100 : 0;

      return {
        dayResult: {
          dayNumber,
          subject: updatedExamDay.subject.name,
          totalQuestions,
          correctAnswers,
          accuracy,
          grade: subjectResult.grade,
        },
        subjectResult,
        nextDay: nextDay
          ? {
              dayNumber: nextDay.dayNumber,
              subject: nextDay.subject?.name,
              status: nextDay.status,
            }
          : null,
        examProgress: {
          completedDays: allResults.length,
          totalDays: 7,
          overallScore: parseFloat(overallScore.toFixed(2)),
          isComplete: dayNumber === 7,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to complete exam day: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate letter grade from percentage
   * @param percentage - Accuracy percentage
   * @returns Letter grade A-F
   */
  private static calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }
}

export default ComprehensiveExamService;