// backend/scripts/seed-production.ts
// Simple script to seed production database from local machine

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function seedProduction() {
  try {
    console.log('🌱 Starting production database seed...');
    
    // Get the production DATABASE_URL from environment
    const prodDbUrl = process.env.DATABASE_URL;
    
    if (!prodDbUrl) {
      throw new Error('DATABASE_URL not set. Please set it before running this script.');
    }
    
    console.log('Database URL:', prodDbUrl.substring(0, 50) + '...');
    
    // Run the seed command with production database
    console.log('Running: npm run seed');
    const { stdout, stderr } = await execAsync('npm run seed', {
      env: {
        ...process.env,
        DATABASE_URL: prodDbUrl
      },
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large output
    });
    
    console.log('STDOUT:', stdout);
    if (stderr) console.log('STDERR:', stderr);
    
    console.log('✅ Production database seeded successfully!');
  } catch (error: any) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
}

seedProduction();