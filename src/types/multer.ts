// backend/src/types/multer.ts
// ✅ FIXED - Only Cloudinary-specific properties

import { Express } from 'express';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        // Cloudinary properties only
        // All standard multer properties are inherited
        public_id?: string;
        secure_url?: string;
        url?: string;
      }
    }
  }
}

export {};