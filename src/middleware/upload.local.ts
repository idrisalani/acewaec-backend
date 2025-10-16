// backend/src/middleware/upload.local.ts
// ✅ DEVELOPMENT - Local disk storage for development environment

import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Get upload directory path
 */
const getUploadDir = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

/**
 * Configure local disk storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = getUploadDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedFilename = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    cb(null, `${uniqueSuffix}-${sanitizedFilename}`);
  },
});

/**
 * File filter - only allow images
 */
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

/**
 * Create multer instance with local storage
 */
export const uploadProfileLocal = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default uploadProfileLocal;