// backend/src/types/express.d.ts
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
      file?: any;        // ← ADD THIS
      files?: any;       // ← ADD THIS
    }
  }
}

export {};