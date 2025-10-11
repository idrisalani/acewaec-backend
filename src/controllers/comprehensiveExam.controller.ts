import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { ComprehensiveExamService } from '../services/comprehensiveExam.service';

const prisma = new PrismaClient();

export class ComprehensiveExamController {
  static async createExam(req: AuthRequest, res: Response) {
    try {
      const { subjects } = req.body;

      if (!subjects || subjects.length !== 7) {
        return res.status(400).json({
          success: false,
          error: 'Must select exactly 7 subjects (one per day)'
        });
      }

      const exam = await ComprehensiveExamService.createExam(req.userId!, subjects);
      res.json({ success: true, data: exam });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create exam';
      res.status(400).json({ success: false, error: message });
    }
  }

  static async getExam(req: AuthRequest, res: Response) {
    try {
      const { examId } = req.params;
      const exam = await ComprehensiveExamService.getExam(examId, req.userId!);
      res.json({ success: true, data: exam });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get exam';
      res.status(404).json({ success: false, error: message });
    }
  }

  static async getUserExams(req: AuthRequest, res: Response) {
    try {
      const exams = await ComprehensiveExamService.getUserExams(req.userId!);
      res.json({ success: true, data: exams });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get exams';
      res.status(500).json({ success: false, error: message });
    }
  }

  static async startDay(req: AuthRequest, res: Response) {
    try {
      const { examId, dayNumber } = req.params;
      const result = await ComprehensiveExamService.startDay(
        examId,
        parseInt(dayNumber),
        req.userId!
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start day';
      res.status(400).json({ success: false, error: message });
    }
  }

  static async completeDay(req: AuthRequest, res: Response) {
    try {
      const { examId, dayNumber } = req.params;
      const { sessionId } = req.body;

      const result = await ComprehensiveExamService.completeDay(
        examId,
        parseInt(dayNumber),
        sessionId,
        req.userId!
      );

      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete day';
      res.status(400).json({ success: false, error: message });
    }
  }

  static async getExamResults(req: AuthRequest, res: Response) {
    try {
      const { examId } = req.params;
      
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
                          options: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: { dayNumber: 'asc' }
          }
        }
      });

      if (!exam || exam.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Exam not found' });
      }

      res.json({ success: true, data: exam });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get results';
      res.status(500).json({ success: false, error: message });
    }
  }
}