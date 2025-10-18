// backend/src/types/exam.types.ts
// ✅ Domain-specific exam types (extracted from auth.types reconciliation)

/**
 * Comprehensive Exam
 * Represents a full exam campaign (e.g., 30-day WAEC prep)
 */
export interface ComprehensiveExam {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  subjects: string[];
  numberOfDays: number;
  questionsPerDay: number;
  completedDays: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exam Day
 * Represents a single day within a comprehensive exam
 */
export interface ExamDay {
  id: string;
  examId: string;
  dayNumber: number;
  subjectId: string;
  questionsCount: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

/**
 * Exam Session
 * Represents an active exam session/attempt
 */
export interface ExamSession {
  id: string;
  examId: string;
  dayNumber: number;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  status: 'in-progress' | 'completed';
}

/**
 * Exam Status enumeration
 */
export enum ExamStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

/**
 * Exam question/answer tracking
 */
export interface ExamQuestion {
  id: string;
  sessionId: string;
  questionId: string;
  userAnswer?: string;
  isCorrect?: boolean;
  timeSpent: number; // in seconds
  skipped: boolean;
}

/**
 * Exam session summary/results
 */
export interface ExamSessionResult {
  sessionId: string;
  examId: string;
  dayNumber: number;
  totalQuestions: number;
  correctAnswers: number;
  skippedQuestions: number;
  score: number; // percentage
  duration: number; // in minutes
  startTime: Date;
  endTime: Date;
  status: ExamStatus;
}

export default ComprehensiveExam;