// backend/src/middleware/upload.ts
// ✅ SMART MIDDLEWARE - Adapts to environment (with Vercel support)

import multer from 'multer';
import uploadProfileLocal from './upload.local';
import uploadProfileCloudinary from './upload.cloudinary';

/**
 * Smart upload middleware that:
 * - Uses local storage in development (NODE_ENV=development on local machine)
 * - Uses Cloudinary in production/Vercel/serverless (NODE_ENV=production)
 * 
 * ⚠️ NOTE: Local storage on Vercel uses /tmp and is temporary!
 *         For production, Cloudinary should always be used.
 * 
 * Usage:
 * router.post('/profile', uploadProfilePicture.single('profilePicture'), controller);
 */

let uploadProfilePicture: multer.Multer;

// Determine if running in production/serverless
const isProduction = process.env.NODE_ENV === 'production' || !process.env.NODE_ENV;
// const isProduction = process.env.NODE_ENV === 'production';
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

// Select storage based on environment
if (isProduction || isServerless) {
  console.log('🔐 Using Cloudinary for profile uploads (Production/Serverless)');
  
  // Ensure Cloudinary credentials exist
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ ERROR: Cloudinary credentials not configured!');
    console.error('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    process.exit(1); // Fail fast - don't start without proper config
  }
  
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
 // path?: string; // Cloudinary URL
  secure_url?: string;
  public_id?: string;
  url?: string; // Cloudinary secure URL
}