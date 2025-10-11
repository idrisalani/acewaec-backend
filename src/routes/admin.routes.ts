import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { AdminController } from '../controllers/admin.controller';
import { QuestionsController } from '../controllers/questions.controller';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|csv|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// ==================== DASHBOARD ====================
router.get('/stats', AdminController.getDashboardStats);

// ==================== USER MANAGEMENT ====================
router.get('/users', AdminController.getAllUsers);
router.get('/users/:userId', AdminController.getUserDetails);
router.post('/users/:userId/approve', AdminController.approveUser);
router.post('/users/:userId/reject', AdminController.rejectUser);
router.post('/users/:userId/suspend', AdminController.suspendUser);
router.post('/users/:userId/activate', AdminController.activateUser);
router.delete('/users/:userId', AdminController.deleteUser);

// ==================== QUESTION MANAGEMENT ====================
router.get('/questions', QuestionsController.getAllQuestions);
router.get('/questions/:id', QuestionsController.getQuestion);
router.post('/questions', QuestionsController.createQuestion);
router.put('/questions/:id', QuestionsController.updateQuestion);
router.delete('/questions/:id', QuestionsController.deleteQuestion);
router.post('/questions/bulk-delete', QuestionsController.bulkDeleteQuestions);

// Bulk Import
router.post('/questions/import', upload.single('file'), QuestionsController.bulkImportQuestions);

// Image Upload
router.post('/upload/image', upload.single('image'), QuestionsController.uploadImage);

// ==================== SUBJECTS & TOPICS ====================
router.get('/subjects', QuestionsController.getSubjects);
router.get('/subjects/:id/topics', QuestionsController.getSubjectTopics);

// ==================== SCHOOL MANAGEMENT ====================
router.get('/schools', AdminController.getAllSchools);
router.post('/schools/:schoolId/approve', AdminController.approveSchool);

export default router;