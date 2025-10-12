import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from '../src/routes/auth.routes';
import questionsRoutes from '../src/routes/questions.routes';
import practiceRoutes from '../src/routes/practice.routes';
import adminRoutes from '../src/routes/admin.routes';
import comprehensiveExamRoutes from '../src/routes/comprehensiveExam.routes';
import analyticsRoutes from '../src/routes/analytics.routes';

const app: Application = express();

// Middleware - EXACTLY like your server.ts
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files
// Note: On Vercel, you'll need to use cloud storage instead (Cloudinary, S3, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AceWAEC Pro API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Routes - EXACTLY like your server.ts
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/comprehensive-exam', comprehensiveExamRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AceWAEC Pro API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      questions: '/api/questions',
      practice: '/api/practice',
      admin: '/api/admin',
      comprehensiveExam: '/api/comprehensive-exam',
      analytics: '/api/analytics',
    },
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ⚠️ KEY DIFFERENCE: NO app.listen() here!
// Vercel handles the HTTP server part

// Export for Vercel serverless
export default app;