// backend/src/app.ts
// Express application configuration - no server listening
// ✅ RECONCILED: Existing code + Static file serving fix for profile uploads

import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs'; // ✅ ADD THIS: Required for directory creation

// Import routes
import authRoutes from './routes/auth.routes';
import questionsRoutes from './routes/questions.routes';
import practiceRoutes from './routes/practice.routes';
import adminRoutes from './routes/admin.routes';
import comprehensiveExamRoutes from './routes/comprehensiveExam.routes';
import analyticsRoutes from './routes/analytics.routes';
import usersRoutes from './routes/users.routes';
import streaksRoutes from './routes/streaks.routes';
import goalsRoutes from './routes/goals.routes';

const app: Application = express();

/**
 * ============================================================================
 * SECURITY MIDDLEWARE
 * ============================================================================
 */
app.use(helmet());

/**
 * ============================================================================
 * CORS CONFIGURATION
 * ============================================================================
 */
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://acewaec-frontend.vercel.app',
    'http://localhost:3000',
  ],
  credentials: true,
}));

/**
 * ============================================================================
 * BODY PARSING MIDDLEWARE
 * ============================================================================
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/**
 * ============================================================================
 * ✅ STATIC FILE SERVING - FIXED FOR PROFILE UPLOADS
 * ============================================================================
 * This serves uploaded files as static content
 * Allows frontend to access: /uploads/profiles/filename.jpg
 * 
 * IMPROVED: Creates directories if they don't exist and caches files
 */

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadsDir, 'profiles');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
  console.log('📁 Created profiles directory:', profilesDir);
}

// Serve uploaded files with caching headers
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',     // Cache for 1 day
  etag: false,      // Disable etag for static files
  lastModified: true
}));

// Also serve profiles directory separately for better performance
app.use('/uploads/profiles', express.static(profilesDir, {
  maxAge: '1d',
  etag: false,
  lastModified: true
}));

console.log('✅ Static file serving configured');
console.log('   📂 Uploads: ' + uploadsDir);
console.log('   📂 Profiles: ' + profilesDir);

/**
 * ============================================================================
 * HEALTH CHECK ENDPOINT
 * ============================================================================
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AceWAEC Pro API is running!',
    timestamp: new Date().toISOString(),
  });
});

/**
 * ============================================================================
 * API ROUTES
 * ============================================================================
 */

// Feature routes
app.use('/api/streaks', streaksRoutes);           // ✅ Streaks tracking
app.use('/api/goals', goalsRoutes);               // ✅ Goals management

// Core routes
app.use('/api/auth', authRoutes);                 // Authentication
app.use('/api/users', usersRoutes);               // User management (includes profile upload)
app.use('/api/questions', questionsRoutes);       // Questions database
app.use('/api/practice', practiceRoutes);         // Practice sessions
app.use('/api/admin', adminRoutes);               // Admin operations
app.use('/api/comprehensive-exam', comprehensiveExamRoutes);  // Comprehensive exams
app.use('/api/analytics', analyticsRoutes);       // User analytics

/**
 * ============================================================================
 * ERROR HANDLING MIDDLEWARE
 * ============================================================================
 */
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 5MB'
    });
  }

  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

export default app;