export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden: insufficient permissions') {
        super(message, 403);
    }
}
export class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400);
    }
}
