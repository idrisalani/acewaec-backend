import { Router, Response } from 'express';
import { execSync } from 'child_process';

const router = Router();

/**
 * POST /seed/run
 * ⚠️ TEMPORARY - Remove after production seeding
 * Runs database seed for one-time initialization
 * 
 * This executes the seed command directly instead of importing
 * to avoid TypeScript rootDir restrictions with prisma/seeders
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
    
    // Run the seed command directly
    try {
      const output = execSync('npm run seed', { encoding: 'utf-8' });
      console.log('Seed output:', output);
    } catch (error: any) {
      console.error('Seed command error:', error.message);
      throw new Error(`Seed command failed: ${error.message}`);
    }
    
    console.log('✅ Database seeding completed successfully!');
    
    res.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        timestamp: new Date().toISOString(),
        note: '⚠️ DELETE THIS ENDPOINT after seeding for security!'
      }
    });
  } catch (error: any) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Seeding failed'
    });
  }
});

export default router;