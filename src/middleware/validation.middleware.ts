import { Request, Response, NextFunction } from 'express';

export const validateSessionPayload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { subjectIds, questionCount, type } = req.body;

  const errors: string[] = [];

  // Validate subjectIds
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    errors.push('subjectIds must be a non-empty array');
  }

  // Validate questionCount
  if (typeof questionCount !== 'number' || questionCount < 1 || questionCount > 100) {
    errors.push('questionCount must be between 1 and 100');
  }

  // Validate type
  const validTypes = ['TIMED', 'TIMED_TEST', 'UNTIMED', 'PRACTICE', 'COMPREHENSIVE', 'MOCK_EXAM', 'CUSTOM'];
  if (type && !validTypes.includes(type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

export const validateSessionId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { sessionId } = req.params;

  if (!sessionId || sessionId.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required'
    });
  }

  next();
};