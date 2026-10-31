import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

const startServer = async () => {
  // Await MongoDB connection before starting the HTTP server
  await connectDatabase();

  const app = createApp();

  const server = app.listen(ENV.PORT, () => {
    console.log(`[Learnova API] Server running in ${ENV.NODE_ENV} mode on port ${ENV.PORT}`);
    console.log(`[Learnova API] Health check endpoint: http://localhost:${ENV.PORT}${ENV.API_PREFIX}/health`);
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Learnova API] ${signal} received. Graceful shutdown initiated...`);
    server.close(async () => {
      console.log('[Learnova API] HTTP server closed.');
      try {
        await disconnectDatabase();
      } catch (err) {
        console.error('[Learnova API] Error while closing database connection:', err);
      }
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('[Learnova API] Graceful shutdown timed out, force exiting.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('[Learnova API] Fatal server startup error:', err.message || err);
  process.exit(1);
});
