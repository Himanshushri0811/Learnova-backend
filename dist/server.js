import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { connectDatabase } from './config/database.js';
const startServer = async () => {
    // Connect to MongoDB
    await connectDatabase();
    const app = createApp();
    const server = app.listen(ENV.PORT, () => {
        console.log(`[Learnova API] Server running in ${ENV.NODE_ENV} mode on port ${ENV.PORT}`);
        console.log(`[Learnova API] Health check endpoint: http://localhost:${ENV.PORT}${ENV.API_PREFIX}/health`);
    });
    // Graceful shutdown handling
    const shutdown = () => {
        console.log('[Learnova API] Graceful shutdown initiated...');
        server.close(() => {
            console.log('[Learnova API] Server closed.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};
startServer().catch((err) => {
    console.error('[Learnova API] Fatal server startup error:', err);
    process.exit(1);
});
