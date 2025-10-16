// backend/src/middleware/upload.ts
// ✅ FIXED - Smart middleware that adapts to environment (no duplicate path)

import multer from 'multer';
import uploadProfileLocal from './upload.local';
import uploadProfileCloudinary from './upload.cloudinary';

/**
 * Smart upload middleware that:
 * - Uses local storage in development (NODE_ENV=development)
 * - Uses Cloudinary in production/Vercel (NODE_ENV=production)
 * 
 * Usage:
 * router.post('/profile', uploadProfilePicture.single('profilePicture'), controller);
 */

let uploadProfilePicture: multer.Multer;

// Select storage based on environment
if (process.env.NODE_ENV === 'production') {
  console.log('📦 Using Cloudinary for profile uploads (Production)');
  uploadProfilePicture = uploadProfileCloudinary;
} else {
  console.log('💾 Using local storage for profile uploads (Development)');
  uploadProfilePicture = uploadProfileLocal;
}

export { uploadProfilePicture };
export default uploadProfilePicture;

/**
 * Type definitions for uploaded files
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  // Local storage properties
  destination?: string;
  filename?: string;
  path?: string;
  // Cloudinary properties
  secure_url?: string;
  public_id?: string;
  url?: string; // Cloudinary secure URL
}