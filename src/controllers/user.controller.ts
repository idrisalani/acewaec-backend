// backend/src/controllers/user.controller.ts
// ✅ Example controller handling profile picture uploads

import { Request, Response } from 'express';
import path from 'path';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  // Local storage
  destination?: string;
  filename?: string;
  path?: string;
  // Cloudinary
  secure_url?: string;
  public_id?: string;
  url?: string;
}

/**
 * Upload profile picture
 * Handles both local storage and Cloudinary uploads
 */
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const file = req.file as UploadedFile;
    
    // Determine profile picture URL based on storage type
    let profilePictureUrl: string;
    
    if (process.env.NODE_ENV === 'production' && file.secure_url) {
      // Cloudinary: use secure_url
      profilePictureUrl = file.secure_url;
      console.log('✅ Profile uploaded to Cloudinary:', profilePictureUrl);
    } else if (file.path) {
      // Local: construct relative path for serving
      profilePictureUrl = `/uploads/profiles/${file.filename}`;
      console.log('✅ Profile saved locally:', profilePictureUrl);
    } else {
      throw new Error('Unable to determine upload URL');
    }

    // Update user profile picture in database
    const userId = req.userId; // Assuming auth middleware sets this
    
    // Example: Update in database
    // const user = await User.update(
    //   { id: userId },
    //   { profilePictureUrl }
    // );

    return res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePictureUrl,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        // If using Cloudinary
        publicId: file.public_id,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed',
    });
  }
};

/**
 * Delete profile picture
 */
export const deleteProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    // If using Cloudinary and have public_id, delete from Cloudinary
    // Example:
    // const user = await User.findById(userId);
    // if (user.profilePicture?.publicId) {
    //   await cloudinary.v2.uploader.destroy(user.profilePicture.publicId);
    // }
    
    // Update database
    // await User.update(
    //   { id: userId },
    //   { profilePictureUrl: null }
    // );

    return res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete profile picture',
    });
  }
};

/**
 * Get profile picture
 * For local storage, middleware serves from /uploads directory
 * For Cloudinary, returns the secure URL
 */
export const getProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    
    // Get user from database
    // const user = await User.findById(userId);
    
    // Return profile picture URL
    return res.status(200).json({
      success: true,
      data: {
        // profilePictureUrl: user?.profilePictureUrl,
      },
    });
  } catch (error) {
    console.error('Get error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile picture',
    });
  }
};

export default {
  uploadProfilePicture,
  deleteProfilePicture,
  getProfilePicture,
};