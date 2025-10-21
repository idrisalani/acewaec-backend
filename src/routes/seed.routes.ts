import { Router, Response } from 'express';

const router = Router();

/**
 * POST /seed/run
 * ⚠️ TEMPORARY - Remove after production seeding
 * Runs database seed for one-time initialization
 */
router.post('/run', async (req: any, res: Response) => {
  try {
    // Security: Check for secret token
    const token = req.headers['x-seed-token'];
    const expectedToken = process.env.SEED_TOKEN || 'dev-token';

    if (token !== expectedToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Invalid or missing seed token.'
      });
    }

    console.log('🌱 Starting database seed...');
    
    // Import seeder dynamically
    try {
      // Use require instead of import to work with CommonJS
      const seedModule = require('../../../prisma/seeders/questions.seeder');
      const seedFunction = seedModule.default || seedModule;
      
      // Run the seeder
      await seedFunction();
      
      console.log('✅ Database seeding completed successfully!');
      
      res.json({
        success: true,
        message: 'Database seeded successfully',
        data: {
          timestamp: new Date().toISOString(),
          note: '⚠️ DELETE THIS ENDPOINT after seeding for security!'
        }
      });
    } catch (importError: any) {
      console.error('❌ Import error:', importError.message);
      throw new Error(`Failed to import seeder: ${importError.message}`);
    }
  } catch (error: any) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Seeding failed'
    });
  }
});

export default router;