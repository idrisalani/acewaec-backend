import app from './app';

const PORT = process.env.PORT || 5000;

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  // Local development: start the server
  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('AceWAEC Pro Backend');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Server running on port ${PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Auth: http://localhost:${PORT}/api/auth/*`);
    console.log(`   Questions: http://localhost:${PORT}/api/questions/*`);
    console.log(`   Practice: http://localhost:${PORT}/api/practice/*`);
    console.log(`   Admin: http://localhost:${PORT}/api/admin/*`);
    console.log(`   Analytics: http://localhost:${PORT}/api/analytics/*`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  });
} else {
  // Vercel serverless: export app for the runtime
  console.log('Running on Vercel serverless');
}

export default app;