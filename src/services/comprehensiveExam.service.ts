import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ComprehensiveExamService {
  // Create a new comprehensive exam
  static async createExam(userId: string, subjects: string[]) {
    if (subjects.length !== 7) {
      throw new Error('Comprehensive exam must have exactly 7 subjects (one per day)');
    }

    // Check if user already has an active exam
    const activeExam = await prisma.comprehensiveExam.findFirst({
      where: {
        userId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }
      }
    });

    if (activeExam) {
      throw new Error('You already have an active comprehensive exam');
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Start at midnight

    const exam = await prisma.comprehensiveExam.create({
      data: {
        userId,
        subjects,
        startDate,
        totalDays: 7,
        questionsPerSubject: 40,
        examDays: {
          create: subjects.map((subjectId, index) => ({
            dayNumber: index + 1,
            subjectId,
            status: index === 0 ? 'AVAILABLE' : 'LOCKED',
            totalQuestions: 40
          }))
        }
      },
      include: {
        examDays: {
          include: {
            subject: true
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    });

    return exam;
  }

  // Get exam details
  static async getExam(examId: string, userId: string) {
    const exam = await prisma.comprehensiveExam.findUnique({
      where: { id: examId },
      include: {
        examDays: {
          include: {
            subject: true,
            session: true
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    });

    if (!exam || exam.userId !== userId) {
      throw new Error('Exam not found');
    }

    // Update day statuses based on current date
    await this.updateDayStatuses(exam);

    return exam;
  }

  // Start a day's exam
  static async startDay(examId: string, dayNumber: number, userId: string) {
    const exam = await this.getExam(examId, userId);
    
    const day = exam.examDays.find(d => d.dayNumber === dayNumber);
    if (!day) throw new Error('Day not found');
    
    if (day.status !== 'AVAILABLE') {
      throw new Error(`Day ${dayNumber} is not available. Status: ${day.status}`);
    }

    // Create practice session for this day
    const session = await prisma.practiceSession.create({
      data: {
        userId,
        name: `Day ${dayNumber} - ${day.subject.name}`,
        type: 'COMPREHENSIVE',
        duration: exam.durationPerDay,
        questionCount: exam.questionsPerSubject,
        subjectIds: [day.subjectId],
        topicIds: []
      }
    });

    // Update day status
    await prisma.examDay.update({
      where: { id: day.id },
      data: {
        status: 'IN_PROGRESS',
        sessionId: session.id,
        startedAt: new Date()
      }
    });

    // Get questions for the day
    const questions = await prisma.question.findMany({
      where: {
        subjectId: day.subjectId,
        isActive: true
      },
      include: {
        options: {
          select: {
            id: true,
            label: true,
            content: true
            // Don't include isCorrect
          }
        },
        subject: true,
        topic: true
      },
      take: exam.questionsPerSubject,
      orderBy: { createdAt: 'desc' }
    });

    if (questions.length < exam.questionsPerSubject) {
      throw new Error(`Not enough questions for ${day.subject.name}`);
    }

    return { session, questions };
  }

  // Complete a day's exam
  static async completeDay(examId: string, dayNumber: number, sessionId: string, userId: string) {
    const exam = await this.getExam(examId, userId);
    const day = exam.examDays.find(d => d.dayNumber === dayNumber);
    
    if (!day || day.sessionId !== sessionId) {
      throw new Error('Invalid day or session');
    }

    // Get session results
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        practiceAnswers: true
      }
    });

    if (!session) throw new Error('Session not found');

    const correctAnswers = session.practiceAnswers.filter(a => a.isCorrect).length;
    const score = (correctAnswers / session.totalQuestions) * 100;

    // Update day
    await prisma.examDay.update({
      where: { id: day.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        correctAnswers,
        score,
        timeSpent: session.timeSpent || 0
      }
    });

    // Unlock next day
    const nextDay = exam.examDays.find(d => d.dayNumber === dayNumber + 1);
    if (nextDay && nextDay.status === 'LOCKED') {
      await prisma.examDay.update({
        where: { id: nextDay.id },
        data: { status: 'AVAILABLE' }
      });
    }

    // Update exam totals
    const completedDays = await prisma.examDay.findMany({
      where: {
        examId,
        status: 'COMPLETED'
      }
    });

    const totalCorrect = completedDays.reduce((sum, d) => sum + d.correctAnswers, 0);
    const totalQuestions = completedDays.reduce((sum, d) => sum + d.totalQuestions, 0);
    const overallScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Check if exam is complete
    const allCompleted = exam.examDays.length === completedDays.length;

    await prisma.comprehensiveExam.update({
      where: { id: examId },
      data: {
        totalQuestions: totalQuestions,
        correctAnswers: totalCorrect,
        overallScore,
        status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: allCompleted ? new Date() : undefined,
        currentDay: dayNumber + 1
      }
    });

    return { day, overallScore, allCompleted };
  }

  // Update day statuses based on missed deadlines
  static async updateDayStatuses(exam: any) {
    const now = new Date();
    const examStartDate = new Date(exam.startDate);

    for (const day of exam.examDays) {
      // Calculate deadline for this day (24 hours from exam start + day number)
      const deadline = new Date(examStartDate);
      deadline.setDate(deadline.getDate() + day.dayNumber);

      // If deadline passed and day is still AVAILABLE or IN_PROGRESS, mark as MISSED
      if (now > deadline && (day.status === 'AVAILABLE' || day.status === 'IN_PROGRESS')) {
        await prisma.examDay.update({
          where: { id: day.id },
          data: { status: 'MISSED' }
        });

        // Unlock next day if it exists
        const nextDay = exam.examDays.find((d: any) => d.dayNumber === day.dayNumber + 1);
        if (nextDay && nextDay.status === 'LOCKED') {
          await prisma.examDay.update({
            where: { id: nextDay.id },
            data: { status: 'AVAILABLE' }
          });
        }
      }
    }
  }

  // Get user's exam history
  static async getUserExams(userId: string) {
    return await prisma.comprehensiveExam.findMany({
      where: { userId },
      include: {
        examDays: {
          include: { subject: true },
          orderBy: { dayNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}