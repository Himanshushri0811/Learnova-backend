
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
    const email =
        typeof req.body?.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';

    const password =
        typeof req.body?.password === 'string'
            ? req.body.password
            : '';

    if (!email || !password) {
        res.status(400).json({
            status: 'error',
            message: 'Email and password are required',
        });
        return;
    }

    const emailMatches =
        email === ENV.ADMIN_EMAIL.trim().toLowerCase();

    const passwordMatches =
        password === ENV.ADMIN_PASSWORD;

    if (!emailMatches || !passwordMatches) {
        res.status(401).json({
            status: 'fail',
            message: 'Invalid email or password',
        });
        return;
    }

    const user = {
        id: 'admin',
        email: ENV.ADMIN_EMAIL,
        role: 'admin' as const,
    };

    const token = jwt.sign(user, ENV.JWT_SECRET, {
        expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    res.status(200).json({
        status: 'success',
        token,
        user,
    });
});

router.get('/me', authenticate, (req: Request, res: Response): void => {
    res.status(200).json({
        status: 'success',
        user: req.user,
    });
});

export const authRouter = router;
