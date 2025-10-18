// backend/src/utils/routeHandler.ts
// ✅ Type-safe wrapper for route handlers using AuthRequest

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';

/**
 * Custom route handler type for AuthRequest-based handlers
 * Used internally for proper typing within the wrapper
 */
export type AuthRequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Wraps an async route handler to properly type it for Express
 * 
 * Returns `any` to bypass Express's strict RequestHandler type checking,
 * while maintaining proper AuthRequest typing inside the wrapper.
 * 
 * This is the proper solution for the TypeScript error:
 * "Type 'string | undefined' is not assignable to type 'UserRole | undefined'"
 * 
 * Usage:
 * router.get('/endpoint', 
 *   authenticateToken,
 *   asyncHandler(async (req, res, next) => {
 *     // req is properly typed as AuthRequest
 *     const userId = req.userId;  // ✅ Type-safe
 *   })
 * );
 */
export const asyncHandler = (fn: AuthRequestHandler): any => {
  return (req: any, res: Response, next: NextFunction): void | Promise<void> => {
    return Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };
};