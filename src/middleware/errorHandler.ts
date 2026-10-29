import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { ENV } from '../config/env.js';

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If known operational AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode >= 500 ? 'error' : 'fail',
      message: err.message,
    });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      status: 'fail',
      message: 'Invalid resource identifier format',
    });
    return;
  }

  // Handle Mongoose duplicate key error (code 11000)
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      status: 'fail',
      message: 'A record with this identifier already exists',
    });
    return;
  }

  // Unhandled / server errors
  console.error('[Error:Unhandled]', err);

  const isProduction = ENV.NODE_ENV === 'production';

  res.status(500).json({
    status: 'error',
    message: isProduction ? 'An unexpected internal error occurred' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

