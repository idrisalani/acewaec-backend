// backend/src/controllers/comprehensiveExam.controller.ts
// ✅ FIXED - Corrected Decimal import and usage

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types'; // ✅ FIX: Import from types
import { ComprehensiveExamService } from '../services/comprehensiveExam.service';

const prisma = new PrismaClient();

/**
 * Comprehensive Exam Controller
 * Handles mock exam creation, management, and result tracking
 */
export class ComprehensiveExamController {
  /**
   * Create a new comprehensive exam
   * @param req - Express request with user info and exam data
   * @param res - Express response
   */
  static async createExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { subjects } = req.body;

      // Validate required fields
      if (!subjects || subjects.length !== 7) {
        res.status(400).json({
          success: false,
          error: 'Must select exactly 7 subjects (one per day)',
        });
        return;
      }

      const exam = await ComprehensiveExamService.createExam(
        req.userId!,
        subjects
      );

      res.status(201).json({
        success: true,
        message: 'Exam created successfully',
        data: exam,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create exam';
      res.status(400).json({ success: false, error: message });
    }
  }

  /**
   * Get all exams for the user
   * @param req - Express request with user info
   * @param res - Express response
   */
  static async getUserExams(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const exams = await ComprehensiveExamService.getUserExams(userId);

      res.status(200).json({
        success: true,
        data: exams,
        total: exams.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch exams';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Get specific exam details
   * @param req - Express request with examId param
   * @param res - Express response
   */
  static async getExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { examId } = req.params;

      if (!examId) {
        res.status(400).json({
          success: false,
          error: 'Exam ID is required',
        });
        return;
      }

      const exam = await ComprehensiveExamService.getExam(examId, req.userId!);

      res.status(200).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch exam';
      res.status(404).json({ success: false, error: message });
    }
  }

  /**
   * Start an exam day
   * @param req - Express request with examId and dayNumber params
   * @param res - Express response
   */
  static async startDay(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { examId, dayNumber } = req.params;
      const userId = req.userId;

      if (!examId || !dayNumber || !userId) {
        res.status(400).json({
          success: false,
          error: 'Exam ID, day number, and user ID are required',
        });
        return;
      }

      const daySession = await ComprehensiveExamService.startDay(
        examId,
        parseInt(dayNumber),
        userId
      );

      res.status(200).json({
        success: true,
        message: `Exam day ${dayNumber} started successfully`,
        data: daySession,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start exam day';
      res.status(400).json({ success: false, error: message });
    }
  }

  /**
   * Complete an exam day and submit answers
   * @param req - Express request with examId, dayNumber, and answers
   * @param res - Express response
   */
  static async completeDay(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { examId, dayNumber } = req.params;
      const { sessionId } = req.body;
      const userId = req.userId;

      if (!examId || !dayNumber || !sessionId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Exam ID, day number, session ID, and answers are required',
        });
        return;
      }

      const dayResult = await ComprehensiveExamService.completeDay(
        examId,
        parseInt(dayNumber),
        sessionId,
        userId
      );

      res.status(200).json({
        success: true,
        message: `Exam day ${dayNumber} completed successfully`,
        data: dayResult,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to complete exam day';
      res.status(400).json({ success: false, error: message });
    }
  }

  /**
   * Get exam results and comprehensive analysis
   * @param req - Express request with examId param
   * @param res - Express response
   */
  static async getExamResults(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = req.userId;

      if (!examId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Exam ID and user ID are required',
        });
        return;
      }

      // Fetch exam with all details
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
            orderBy: { dayNumber: 'asc' },
          },
        },
      });

      if (!exam || exam.userId !== userId) {
        res.status(404).json({ success: false, error: 'Exam not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch exam results';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Pause an exam
   * @param req - Express request with examId param
   * @param res - Express response
   */
  static async pauseExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = req.userId;

      if (!examId) {
        res.status(400).json({
          success: false,
          error: 'Exam ID is required',
        });
        return;
      }

      // Verify exam belongs to user
      const exam = await prisma.comprehensiveExam.findUnique({
        where: { id: examId },
      });

      if (!exam || exam.userId !== userId) {
        res.status(404).json({ success: false, error: 'Exam not found' });
        return;
      }

      // Update exam status to paused
      const updatedExam = await prisma.comprehensiveExam.update({
        where: { id: examId },
        data: { status: 'ABANDONED' },
      });

      res.status(200).json({
        success: true,
        message: 'Exam paused successfully',
        data: updatedExam,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to pause exam';
      res.status(400).json({ success: false, error: message });
    }
  }

  /**
   * Resume a paused exam
   * @param req - Express request with examId param
   * @param res - Express response
   */
  static async resumeExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = req.userId;

      if (!examId) {
        res.status(400).json({
          success: false,
          error: 'Exam ID is required',
        });
        return;
      }

      // Verify exam belongs to user
      const exam = await prisma.comprehensiveExam.findUnique({
        where: { id: examId },
      });

      if (!exam || exam.userId !== userId) {
        res.status(404).json({ success: false, error: 'Exam not found' });
        return;
      }

      // Update exam status to active
      const updatedExam = await prisma.comprehensiveExam.update({
        where: { id: examId },
        data: { status: 'IN_PROGRESS' },
      });

      res.status(200).json({
        success: true,
        message: 'Exam resumed successfully',
        data: updatedExam,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to resume exam';
      res.status(400).json({ success: false, error: message });
    }
  }

  /**
   * Delete an exam
   * @param req - Express request with examId param
   * @param res - Express response
   */
  static async deleteExam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = req.userId;

      if (!examId) {
        res.status(400).json({
          success: false,
          error: 'Exam ID is required',
        });
        return;
      }

      // Verify exam belongs to user before deletion
      const exam = await prisma.comprehensiveExam.findUnique({
        where: { id: examId },
      });

      if (!exam || exam.userId !== userId) {
        res.status(404).json({ success: false, error: 'Exam not found' });
        return;
      }

      // Delete the exam (and related data via cascade delete)
      await prisma.comprehensiveExam.delete({
        where: { id: examId },
      });

      res.status(200).json({
        success: true,
        message: 'Exam deleted successfully',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete exam';
      res.status(400).json({ success: false, error: message });
    }
  }
}

export default ComprehensiveExamController;