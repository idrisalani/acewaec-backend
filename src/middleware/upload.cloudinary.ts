// backend/src/middleware/upload.cloudinary.ts
// ✅ PRODUCTION & DEVELOPMENT - Cloud storage via Cloudinary (Vercel-compatible)
// @ts-nocheck
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from 'cloudinary';

// Initialize Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: async (req, file) => {
    return {
      folder: 'acewaec-pro/profiles',
      resource_type: 'auto',
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.fieldname}`,
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' }, // Profile pic optimization
        { quality: 'auto' },
      ],
    };
  },
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

// Create multer instance with Cloudinary storage
export const uploadProfileCloudinary = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export default uploadProfileCloudinary;