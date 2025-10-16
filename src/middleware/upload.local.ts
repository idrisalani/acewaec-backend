// backend/src/middleware/upload.local.ts
// ✅ DEVELOPMENT ONLY - Local disk storage for local development

import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Get upload directory path
 * - Uses /tmp for serverless environments (Vercel, Lambda, etc.)
 * - Uses local ./uploads for regular Node.js servers
 */
const getUploadDir = () => {
  // Check if running in serverless environment
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  
  let uploadsDir: string;
  
  if (isServerless) {
    // Use /tmp in serverless environments (files won't persist!)
    uploadsDir = '/tmp/uploads/profiles';
    console.warn('⚠️  Running in serverless environment. Using /tmp for uploads (temporary storage only)');
    console.warn('⚠️  For production, use Cloudinary or S3 instead!');
  } else {
    // Use local directory in traditional server environments
    uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
  }
  
  // Try to create directory if it doesn't exist
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (error) {
    console.error('❌ Failed to create uploads directory:', error);
    // Continue anyway - multer will handle the error when a file is actually uploaded
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