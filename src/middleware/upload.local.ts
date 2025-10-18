// backend/src/middleware/upload.local.ts
// Development-only local file storage for profile uploads
// SAFE: No file system operations at module load time

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'profiles');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create directory only when a file is being uploaded
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(null, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = `profile-${timestamp}-${random}${ext}`;
    cb(null, name);
  }
});

// File filter - only allow images
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

// Create and export multer instance
export const uploadProfileLocal = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

export default uploadProfileLocal;