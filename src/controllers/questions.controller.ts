// @ts-nocheck
import { Request, Response } from 'express';
import { QuestionsService } from '../services/questions.service';
import { PrismaClient, QuestionType, DifficultyLevel } from '@prisma/client';
import { AuthRequest } from '../types/index';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export class QuestionsController {
  // ==================== EXISTING PUBLIC METHODS ====================
  
  static async getSubjects(req: Request, res: Response): Promise<void> {
    try {
      const subjects = await QuestionsService.getSubjects();
      res.json({ success: true, data: subjects });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getTopics(req: Request, res: Response): Promise<void> {
    try {
      const { subjectId } = req.params;
      const topics = await QuestionsService.getTopicsBySubject(subjectId);
      res.json({ success: true, data: topics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { subjectIds, topicIds, difficulty, limit } = req.query;

      const questions = await QuestionsService.getQuestions({
        subjectIds: subjectIds ? String(subjectIds).split(',') : undefined,
        topicIds: topicIds ? String(topicIds).split(',') : undefined,
        difficulty: difficulty as string,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json({ success: true, data: questions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRandomQuestions(req: Request, res: Response): Promise<void> {
    try {
      const {
        count,
        subjectIds,
        topicIds,
        difficulty,
        category,
        excludeIds
      } = req.query;

      const result = await QuestionsService.getRandomQuestions({
        count: count ? parseInt(count as string) : 20,
        subjectIds: subjectIds ? String(subjectIds).split(',') : undefined,
        topicIds: topicIds ? String(topicIds).split(',') : undefined,
        difficulty: difficulty as string,
        category: category as string,
        excludeIds: excludeIds ? String(excludeIds).split(',') : undefined,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async checkAnswer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { questionId } = req.params;
      const { answer } = req.body;

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          options: true,
          subject: { select: { name: true } },
          topic: { select: { name: true } }
        }
      });

      if (!question) {
        res.status(404).json({ success: false, error: 'Question not found' });
        return;
      }

      const isCorrect = question.correctAnswer === answer;
      const correctOption = question.options.find(o => o.isCorrect);

      res.json({
        success: true,
        data: {
          isCorrect,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          correctOption
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkImport(req: AuthRequest, res: Response) {
    try {
      const questions = req.body.questions;
      const createdQuestions = [];
      const errors = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        try {
          const subject = await prisma.subject.findFirst({
            where: { code: q.subjectCode }
          });

          if (!subject) {
            errors.push({
              row: i + 2,
              error: `Subject with code '${q.subjectCode}' not found`
            });
            continue;
          }

          let topic = null;
          if (q.topicName) {
            topic = await prisma.topic.findFirst({
              where: {
                name: q.topicName,
                subjectId: subject.id
              }
            });

            if (!topic) {
              topic = await prisma.topic.create({
                data: {
                  name: q.topicName,
                  subjectId: subject.id,
                  isActive: true
                }
              });
            }
          }

          const question = await prisma.question.create({
            data: {
              content: q.content,
              explanation: q.explanation || null,
              difficulty: q.difficulty || 'MEDIUM',
              correctAnswer: q.correctAnswer,
              year: q.year || new Date().getFullYear(),
              subjectId: subject.id,
              ...(topic && { topicId: topic.id }),
              isActive: true,
              options: {
                create: [
                  { label: 'A', content: q.optionA, isCorrect: q.correctAnswer === 'A' },
                  { label: 'B', content: q.optionB, isCorrect: q.correctAnswer === 'B' },
                  { label: 'C', content: q.optionC, isCorrect: q.correctAnswer === 'C' },
                  { label: 'D', content: q.optionD, isCorrect: q.correctAnswer === 'D' }
                ]
              }
            }
          });

          createdQuestions.push(question);
        } catch (error) {
          errors.push({
            row: i + 2,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          created: createdQuestions.length,
          errors: errors.length,
          errorDetails: errors
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk import failed';
      res.status(500).json({ success: false, error: message });
    }
  }

  // ==================== NEW ADMIN CRUD METHODS ====================

  static async getAllQuestions(req: AuthRequest, res: Response) {
    try {
      const { 
        page = '1', 
        limit = '20', 
        subject, 
        topic, 
        difficulty, 
        search,
        year,
        status
      } = req.query;

      const where: any = {};
      
      if (status === 'active') where.isActive = true;
      if (status === 'inactive') where.isActive = false;
      if (subject) where.subjectId = subject as string;
      if (topic) where.topicId = topic as string;
      if (difficulty) where.difficulty = difficulty as DifficultyLevel;
      if (year) where.year = parseInt(year as string);
      if (search) {
        where.OR = [
          { content: { contains: search as string, mode: 'insensitive' } },
          { explanation: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const [questions, total] = await Promise.all([
        prisma.question.findMany({
          where,
          include: {
            subject: { select: { id: true, name: true, code: true } },
            topic: { select: { id: true, name: true } },
            options: { orderBy: { label: 'asc' } }
          },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.question.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          questions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error: any) {
      console.error('Get all questions error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const question = await prisma.question.findUnique({
        where: { id },
        include: {
          subject: true,
          topic: true,
          options: { orderBy: { label: 'asc' } }
        }
      });

      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      res.json({ success: true, data: question });
    } catch (error: any) {
      console.error('Get question error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createQuestion(req: Request, res: Response) {
    try {
      const { 
        content, 
        explanation, 
        type, 
        difficulty, 
        year, 
        correctAnswer, 
        subjectId, 
        topicId, 
        options,
        imageUrl,
        tags,
        category
      } = req.body;

      if (!options || options.length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least 2 options are required' 
        });
      }

      const question = await prisma.question.create({
        data: {
          content,
          explanation,
          type: (type as QuestionType) || 'MULTIPLE_CHOICE',
          difficulty: (difficulty as DifficultyLevel) || 'MEDIUM',
          year: year ? parseInt(year) : null,
          correctAnswer,
          imageUrl,
          tags: tags || [],
          category: category || 'SCIENCE',
          subject: { connect: { id: subjectId } },
          ...(topicId && { topic: { connect: { id: topicId } } }),
          options: {
            create: options.map((opt: any) => ({
              content: opt.content,
              label: opt.label,
              isCorrect: opt.label === correctAnswer
            }))
          }
        },
        include: {
          subject: true,
          topic: true,
          options: true
        }
      });

      res.status(201).json({ success: true, data: question });
    } catch (error: any) {
      console.error('Create question error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        content, 
        explanation, 
        type, 
        difficulty, 
        year, 
        correctAnswer, 
        subjectId, 
        topicId, 
        options,
        imageUrl,
        tags,
        category
      } = req.body;

      await prisma.questionOption.deleteMany({ 
        where: { questionId: id } 
      });

      const question = await prisma.question.update({
        where: { id },
        data: {
          content,
          explanation,
          type: type as QuestionType,
          difficulty: difficulty as DifficultyLevel,
          year: year ? parseInt(year) : null,
          correctAnswer,
          imageUrl,
          tags: tags || [],
          category,
          subjectId,
          topicId: topicId || null,
          options: {
            create: options.map((opt: any) => ({
              content: opt.content,
              label: opt.label,
              isCorrect: opt.label === correctAnswer
            }))
          }
        },
        include: {
          subject: true,
          topic: true,
          options: true
        }
      });

      res.json({ success: true, data: question });
    } catch (error: any) {
      console.error('Update question error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.question.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error: any) {
      console.error('Delete question error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkDeleteQuestions(req: Request, res: Response) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Question IDs array is required' 
        });
      }

      await prisma.question.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false }
      });

      res.json({ 
        success: true, 
        message: `${ids.length} questions deleted successfully` 
      });
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkImportQuestions(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const questions: any[] = [];
      const errors: string[] = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          try {
            questions.push({
              content: row.content?.trim(),
              explanation: row.explanation?.trim(),
              difficulty: row.difficulty || 'MEDIUM',
              correctAnswer: row.correctAnswer?.trim(),
              subjectCode: row.subjectCode?.trim(),
              topicName: row.topicName?.trim(),
              category: row.category || 'SCIENCE',
              year: row.year ? parseInt(row.year) : new Date().getFullYear(),
              options: [
                { label: 'A', content: row.optionA?.trim() },
                { label: 'B', content: row.optionB?.trim() },
                { label: 'C', content: row.optionC?.trim() },
                { label: 'D', content: row.optionD?.trim() }
              ].filter(opt => opt.content)
            });
          } catch (err) {
            errors.push(`Error parsing row: ${err}`);
          }
        })
        .on('end', async () => {
          const created = [];
          const failed = [];

          for (const q of questions) {
            try {
              const subject = await prisma.subject.findFirst({
                where: { code: q.subjectCode }
              });

              if (!subject) {
                failed.push(`Subject '${q.subjectCode}' not found`);
                continue;
              }

              let topic = null;
              if (q.topicName) {
                topic = await prisma.topic.findFirst({
                  where: { name: q.topicName, subjectId: subject.id }
                });
              }

              const question = await prisma.question.create({
                data: {
                  content: q.content,
                  explanation: q.explanation,
                  difficulty: q.difficulty as DifficultyLevel,
                  year: q.year,
                  correctAnswer: q.correctAnswer,
                  category: q.category,
                  subject: { connect: { id: subject.id } },
                  ...(topic && { topic: { connect: { id: topic.id } } }),
                  options: {
                    create: q.options.map((opt: any) => ({
                      content: opt.content,
                      label: opt.label,
                      isCorrect: opt.label === q.correctAnswer
                    }))
                  }
                }
              });
              created.push(question.id);
            } catch (err: any) {
              failed.push(`Question error: ${err.message}`);
            }
          }

          fs.unlinkSync(req.file!.path);

          res.json({ 
            success: true,
            data: {
              imported: created.length,
              failed: failed.length,
              total: questions.length,
              errors: [...errors, ...failed]
            }
          });
        })
        .on('error', () => {
          res.status(500).json({ success: false, error: 'CSV parsing failed' });
        });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image uploaded' });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ success: true, data: { imageUrl } });
    } catch (error: any) {
      console.error('Upload image error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getSubjectTopics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const topics = await prisma.topic.findMany({
        where: { 
          subjectId: id,
          isActive: true
        },
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json({ success: true, data: topics });
    } catch (error: any) {
      console.error('Get topics error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}