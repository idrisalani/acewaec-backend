// backend/src/app.FIXED.ts
// Express application configuration
// ✅ FIXED: Proper CORS for image loading + Static file serving

import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

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
 * ✅ FIXED: CORS CONFIGURATION
 * ============================================================================
 * 
 * IMPORTANT: Order matters!
 * 1. Apply CORS before body parsing
 * 2. Handle preflight OPTIONS requests
 * 3. Whitelist frontend origins
 * 4. Don't require credentials for images (they're public)
 */

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',           
  'http://localhost:5173',           // Vite default
  'https://acewaec-frontend.vercel.app',
  'https://acewaec-frontend.netlify.app',
];

console.log('🔐 CORS Configuration:');
console.log('   Allowed origins:', allowedOrigins);

// ⭐ FIXED: CORS middleware with proper configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
      // Don't block, just log - return error for security
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-JSON-Response'],
  maxAge: 86400 // 24 hours
}));

// ⭐ FIXED: Explicitly handle preflight requests
app.options('*', cors());

// ⭐ NEW: Special CORS for static files (images, uploads)
// Static files (images) don't need strict CORS since they're public
app.use('/uploads', cors({
  origin: '*', // Allow all origins for images
  methods: ['GET', 'HEAD', 'OPTIONS'],
  maxAge: 86400
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
 * ✅ FIXED: STATIC FILE SERVING
 * ============================================================================
 * Serves user uploads:
 * - /uploads/profiles/filename.jpg → served from backend
 * - Frontend at localhost:5173 can load via localhost:5000/uploads
 */

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
  console.log('📁 Created profiles directory:', profilesDir);
}

/**
 * ⭐ FIXED: Serve uploads with proper headers
 * 
 * Key fixes:
 * 1. Use absolute path from process.cwd() instead of __dirname
 * 2. Add proper Cache-Control headers
 * 3. Set correct MIME types
 * 4. Disable etag to avoid 304 Not Modified issues
 */
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',              // Browser cache: 1 day
  etag: false,               // Disable etag (causes redirect issues)
  lastModified: true,        // Keep last-modified header
  setHeaders: (res, filePath) => {
    // ✅ FIXED: Proper cache headers
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.set('X-Content-Type-Options', 'nosniff');
    
    // Ensure correct content type
    if (filePath.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.gif')) {
      res.set('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.set('Content-Type', 'image/webp');
    }
  }
}));

console.log('✅ Static file serving configured:');
console.log('   📂 Uploads path:', uploadsDir);
console.log('   📂 Profiles path:', profilesDir);
console.log('   🌐 Accessible at: http://localhost:5000/uploads/profiles/filename.jpg');

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
    uploads: {
      path: uploadsDir,
      accessible: fs.existsSync(uploadsDir),
      profiles: fs.existsSync(profilesDir)
    }
  });
});

/**
 * ============================================================================
 * API ROUTES
 * ============================================================================
 */

// Feature routes
app.use('/api/streaks', streaksRoutes);           // Streaks tracking
app.use('/api/goals', goalsRoutes);               // Goals management

// Core routes
app.use('/api/auth', authRoutes);                 // Authentication
app.use('/api/users', usersRoutes);               // User management + profile upload
app.use('/api/questions', questionsRoutes);       // Questions database
app.use('/api/practice', practiceRoutes);         // Practice sessions
app.use('/api/admin', adminRoutes);               // Admin operations
app.use('/api/comprehensive-exam', comprehensiveExamRoutes);  // Exams
app.use('/api/analytics', analyticsRoutes);       // Analytics

/**
 * ============================================================================
 * 404 HANDLER
 * ============================================================================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

/**
 * ============================================================================
 * ERROR HANDLING MIDDLEWARE
 * ============================================================================
 */
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });

  // CORS error
  if (err.message === 'CORS not allowed') {
    return res.status(403).json({
      success: false,
      error: 'CORS not allowed for this origin',
      origin: req.headers.origin
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 5MB'
    });
  }

  // Multer file type error
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // Syntax error (JSON parse)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body'
    });
  }

  // Default error response
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;