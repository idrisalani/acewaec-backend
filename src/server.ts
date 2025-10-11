import 'dotenv/config'; 
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth.routes';
import questionsRoutes from './routes/questions.routes';
import practiceRoutes from './routes/practice.routes';
import adminRoutes from './routes/admin.routes'; 
import comprehensiveExamRoutes from './routes/comprehensiveExam.routes';
import analyticsRoutes from './routes/analytics.routes';


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000', // Backup for Create React App
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Increased for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AceWAEC Pro API is running!',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionsRoutes); // Also fix this one
app.use('/api/practice', practiceRoutes); // FIXED
app.use('/api/admin', adminRoutes);
app.use('/api/comprehensive-exam', comprehensiveExamRoutes);
app.use('/api/analytics', analyticsRoutes);


app.listen(PORT, () => {
  console.log(`AceWAEC Pro Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`Admin endpoints: http://localhost:${PORT}/api/admin/*`); // ADD THIS
});

export default app;