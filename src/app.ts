import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ENV } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ForbiddenError, NotFoundError } from './utils/errors.js';

export const createApp = (): express.Application => {
  const app = express();

  // Trust proxy for rate limiting behind Render / Cloud reverse proxies
  app.set('trust proxy', 1);

  // Security Headers via Helmet
  app.use(helmet());

  // CORS configuration supporting single origin or comma-separated list
  const allowedOrigins = [
    ...ENV.CORS_ORIGIN.split(',').map((origin) => origin.trim().replace(/\/$/, '')),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
        return callback(new ForbiddenError(`Origin '${origin}' not allowed by CORS policy`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

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
