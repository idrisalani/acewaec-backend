// backend/src/types/express.d.ts
// ✅ EXPRESS TYPE AUGMENTATION - Properly extends Express Request type globally

import { UserRole } from './index';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};