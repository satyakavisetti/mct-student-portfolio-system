require('dotenv').config();
const app = require('./src/app');
const {
  startCodingSyncCron,
  runInitialSync,
} = require('./src/cron/codingSyncCron');

const PORT = Number(process.env.PORT || 5000);

const startServer = (port) => {
  const server = app.listen(port, async () => {
    console.log(`\n🚀 MCT Backend running on http://localhost:${port}`);
    console.log(`📡 Health: http://localhost:${port}/api/health\n`);

    try {
      await runInitialSync();
      startCodingSyncCron();

      console.log('[Coding Sync] Initial sync completed and cron started.');
    } catch (error) {
      console.error('[Coding Sync] Startup failed:', error.message);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is busy. Trying ${port + 1}...`);
      startServer(port + 1);
      return;
    }
    console.error('Failed to start server:', err);
    process.exit(1);
  });
};

startServer(PORT);
