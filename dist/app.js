import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ENV } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ForbiddenError, NotFoundError } from './utils/errors.js';
export const createApp = () => {
    const app = express();
    // Trust proxy for rate limiting behind Render / Cloud reverse proxies
    app.set('trust proxy', 1);
    // Exact production origin and local development origins
    const defaultAllowedOrigins = [
        'https://learnova-edai.netlify.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];
    // Parse any additional comma-separated origins from environment variable
    const envOrigins = ENV.CORS_ORIGIN
        ? ENV.CORS_ORIGIN.split(',')
            .map((origin) => origin.trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, ''))
            .filter(Boolean)
        : [];
    const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));
    const corsOptions = {
        origin: (origin, callback) => {
            // Allow non-browser requests with no origin (e.g. mobile apps, curl, server-to-server)
            if (!origin)
                return callback(null, true);
            const normalizedOrigin = origin.trim().replace(/\/$/, '').toLowerCase();
            const isAllowed = allowedOrigins.some((allowed) => allowed.toLowerCase() === normalizedOrigin);
            if (isAllowed) {
                return callback(null, true);
            }
            return callback(new ForbiddenError(`Origin '${origin}' not allowed by CORS policy`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        optionsSuccessStatus: 204,
    };
    // 1. CORS middleware runs before all other middleware and routes
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));
    // 2. Security Headers via Helmet (configured to allow cross-origin API access)
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    // 3. Body Parsing with payload size limit
    app.use(express.json({ limit: '500kb' }));
    app.use(express.urlencoded({ extended: true, limit: '500kb' }));
    // 4. Global API Rate Limiting
    app.use(ENV.API_PREFIX, apiLimiter);
    // 5. Mount API Routes
    app.use(ENV.API_PREFIX, apiRouter);
    // Unmatched route handler (404)
    app.use('*', (_req, _res, next) => {
        next(new NotFoundError('The requested API resource does not exist'));
    });
    // Centralized Error Handling Middleware
    app.use(errorHandler);
    return app;
};
