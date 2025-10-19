// @ts-nocheck

import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file uploaded' 
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'acewaec/questions',
      resource_type: 'image'
    });
    
    res.json({ 
      success: true, 
      data: { url: result.secure_url } 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

export default router;