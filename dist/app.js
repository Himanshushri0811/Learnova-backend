import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ENV } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
export const createApp = () => {
    const app = express();
    // Security Headers via Helmet
    app.use(helmet());
    // Restricted CORS configuration
    app.use(cors({
        origin: [ENV.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    // Body Parsing with payload size limit
    app.use(express.json({ limit: '500kb' }));
    app.use(express.urlencoded({ extended: true, limit: '500kb' }));
    // Global API Rate Limiting
    app.use(ENV.API_PREFIX, apiLimiter);
    // Mount API Routes
    app.use(ENV.API_PREFIX, apiRouter);
    // Unmatched route handler (404)
    app.use('*', (_req, _res, next) => {
        next(new NotFoundError('The requested API resource does not exist'));
    });
    // Centralized Error Handling Middleware
    app.use(errorHandler);
    return app;
};
