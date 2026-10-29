import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
export const authenticate = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authentication token missing or invalid');
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        throw new UnauthorizedError('Token expired or invalid');
    }
};
export const requireRole = (allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            throw new UnauthorizedError('Authentication required');
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw new ForbiddenError(`Action forbidden: Role '${req.user.role}' lacks permission for this resource`);
        }
        next();
    };
};
/**
 * Ensures student or guardian can only access authorized student records
 */
export const requireStudentAccess = (req, _res, next) => {
    if (!req.user) {
        throw new UnauthorizedError('Authentication required');
    }
    const requestedStudentId = req.params.studentId || req.params.id;
    // Admins have universal management access
    if (req.user.role === 'admin') {
        return next();
    }
    // Students can only access their own record
    if (req.user.role === 'student') {
        if (req.user.id !== requestedStudentId) {
            throw new ForbiddenError('Students can only access their own records');
        }
        return next();
    }
    // Guardians can only access linked child records
    if (req.user.role === 'guardian') {
        const linked = req.user.linkedStudentIds || [];
        if (!linked.includes(requestedStudentId)) {
            throw new ForbiddenError('Guardians can only access records of linked children');
        }
        return next();
    }
    throw new ForbiddenError('Unauthorized student record access');
};
