import rateLimit from 'express-rate-limit';
// General API requests: 300 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Too many requests. Please wait a few minutes and try again.',
    },
    skip: (req) => req.method === 'OPTIONS',
});
// Strict protection for authentication and public enquiry routes
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Too many attempts. Please wait before trying again.',
    },
    skipSuccessfulRequests: false,
    skip: (req) => req.method === 'OPTIONS',
});
