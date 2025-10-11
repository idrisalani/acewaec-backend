import { PrismaClient, SessionStatus } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

const prisma = new PrismaClient();


export class PracticeService {

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static async startSession(sessionId: string, userId: string) {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== userId) {
      throw new Error('Session not found');
    }

    if (session.status !== SessionStatus.NOT_STARTED) {
      throw new Error('Session already started');
    }

    // Fetch questions with randomization
    const allQuestions = await prisma.question.findMany({
      where: {
        subjectId: { in: session.subjectIds },
        topicId: session.topicIds.length > 0 ? { in: session.topicIds } : undefined,
        isActive: true
      },
      include: {
        options: {
          select: {
            id: true,
            label: true,
            content: true
            // Don't include isCorrect in the response
          }
        },
        subject: true,
        topic: true
      }
    });

    // Shuffle questions randomly
    const shuffledQuestions = this.shuffleArray(allQuestions);
    const selectedQuestions = shuffledQuestions.slice(0, session.questionCount);

    if (selectedQuestions.length < session.questionCount) {
      throw new Error(`Not enough questions. Found ${selectedQuestions.length}, need ${session.questionCount}`);
    }

    // Shuffle options for each question
    const questionsWithShuffledOptions = selectedQuestions.map(q => ({
      ...q,
      options: this.shuffleArray(q.options)
    }));

    // Update session status
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });

    return {
      session,
      questions: questionsWithShuffledOptions
    };
  }

  static async submitAnswer(sessionId: string, userId: string, data: any) {
    const { questionId, selectedAnswer } = data;

    const session = await prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = question.correctAnswer === selectedAnswer;

    const answer = await prisma.practiceAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId,
        },
      },
      update: {
        selectedAnswer,
        isCorrect,
      },
      create: {
        sessionId,
        questionId,
        selectedAnswer,
        isCorrect,
      },
    });

    return answer;
  }

  static async completeSession(sessionId: string, userId: string) {
    const session = await prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        practiceAnswers: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const correctAnswers = session.practiceAnswers.filter(a => a.isCorrect).length;
    const wrongAnswers = session.practiceAnswers.filter(a => !a.isCorrect && a.selectedAnswer).length;
    const skipped = session.totalQuestions - session.practiceAnswers.length;
    const score = session.totalQuestions > 0 ? (correctAnswers / session.totalQuestions) * 100 : 0;

    const updatedSession = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        correctAnswers,
        wrongAnswers,
        skippedQuestions: skipped,
        score,
        completedAt: new Date(),
      },
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
    });

    await AnalyticsService.updateAnalytics(sessionId, userId);

    return updatedSession;
  }
}