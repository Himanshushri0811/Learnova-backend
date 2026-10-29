import rateLimit from 'express-rate-limit';
// Global API rate limiter: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
});
// Stricter limiter for public enquiries and auth attempts: 10 requests per 15 minutes
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Too many requests submitted. Please wait before trying again.',
    },
});
