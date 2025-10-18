// backend/src/app.ts
// Express application configuration - no server listening

import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth.routes';
import questionsRoutes from './routes/questions.routes';
import practiceRoutes from './routes/practice.routes';
import adminRoutes from './routes/admin.routes';
import comprehensiveExamRoutes from './routes/comprehensiveExam.routes';
import analyticsRoutes from './routes/analytics.routes';

const app: Application = express();

// Middleware
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AceWAEC Pro API is running!',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/comprehensive-exam', comprehensiveExamRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware (optional)
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

export default app;