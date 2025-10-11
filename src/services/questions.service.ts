import { PrismaClient, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

export class QuestionsService {
  static async getSubjects() {
    return await prisma.subject.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
  }

  static async getTopicsBySubject(subjectId: string) {
    return await prisma.topic.findMany({
      where: {
        subjectId,
        isActive: true
      },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
  }

  static async getQuestions(filters: {
    subjectIds?: string[];
    topicIds?: string[];
    difficulty?: string;
    limit?: number;
  }) {
    const { subjectIds, topicIds, difficulty, limit = 20 } = filters;

    const where: any = {};

    if (subjectIds && subjectIds.length > 0) {
      where.subjectId = { in: subjectIds };
    }

    if (topicIds && topicIds.length > 0) {
      where.topicId = { in: topicIds };
    }

    if (difficulty) {
      where.difficulty = difficulty as DifficultyLevel; // Type cast here
    }

    return await prisma.question.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        topic: { select: { id: true, name: true } },
        options: { select: { id: true, content: true, label: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getRandomQuestions(filters: {
    count?: number;
    subjectIds?: string[];
    topicIds?: string[];
    difficulty?: string;
    category?: string; // NEW: SCIENCE, ART, COMMERCIAL
    excludeIds?: string[];
  }) {
    const { count = 20, subjectIds, topicIds, difficulty, category, excludeIds = [] } = filters;

    const where: any = { isActive: true };

    // Filter by category (find subjects that match)
    if (category) {
      const subjectsInCategory = await prisma.subject.findMany({
        where: {
          categories: {
            has: category
          }
        },
        select: { id: true }
      });

      const categorySubjectIds = subjectsInCategory.map(s => s.id);

      // If subjectIds also provided, use intersection
      if (subjectIds && subjectIds.length > 0) {
        where.subjectId = {
          in: subjectIds.filter(id => categorySubjectIds.includes(id))
        };
      } else {
        where.subjectId = { in: categorySubjectIds };
      }
    } else if (subjectIds && subjectIds.length > 0) {
      where.subjectId = { in: subjectIds };
    }

    if (topicIds && topicIds.length > 0) {
      where.topicId = { in: topicIds };
    }

    if (difficulty) {
      where.difficulty = difficulty as DifficultyLevel;
    }

    // Exclude already answered questions
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    // Get total count for metadata
    const totalCount = await prisma.question.count({ where });

    // Get more questions than needed, then shuffle
    const questions = await prisma.question.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            categories: true // Include categories
          }
        },
        topic: { select: { id: true, name: true } },
        options: {
          select: {
            id: true,
            content: true,
            label: true
            // isCorrect excluded - will be revealed after answering
          }
        },
      },
      take: Math.min(count * 3, 500), // Get 3x requested, max 500
    });

    // Shuffle using Fisher-Yates algorithm
    const shuffled = questions
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
      .slice(0, count);

    return {
      questions: shuffled,
      totalAvailable: totalCount,
      returned: shuffled.length
    };
  }
}