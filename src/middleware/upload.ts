// backend/src/middleware/upload.ts
// Smart upload middleware that adapts to environment

import multer from 'multer';
import uploadProfileLocal from './upload.local';
import uploadProfileCloudinary from './upload.cloudinary';

/**
 * Smart upload middleware that:
 * - Uses local storage in development (NODE_ENV=development)
 * - Uses Cloudinary in production/Vercel/serverless (NODE_ENV=production)
 * 
 * WARNING: Production always requires Cloudinary credentials to be configured.
 * 
 * Usage:
 * router.post('/profile', uploadProfilePicture.single('profilePicture'), controller);
 */

let uploadProfilePicture: multer.Multer;

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || !process.env.NODE_ENV;
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

// Select storage based on environment
if (isProduction || isServerless) {
  console.log('🌩️  Using Cloudinary for profile uploads (Production/Serverless)');
  
  // Validate Cloudinary configuration
  const cloudinaryName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryKey = process.env.CLOUDINARY_API_KEY;
  const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudinaryName || !cloudinaryKey || !cloudinarySecret) {
    console.error('❌ ERROR: Cloudinary credentials not configured!');
    console.error('   Required environment variables:');
    console.error('   - CLOUDINARY_CLOUD_NAME');
    console.error('   - CLOUDINARY_API_KEY');
    console.error('   - CLOUDINARY_API_SECRET');
    
    // For production, fail fast
    if (isProduction) {
      throw new Error('Cloudinary credentials missing. Cannot start in production mode.');
    }
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
  secure_url?: string;
  public_id?: string;
  url?: string;
}