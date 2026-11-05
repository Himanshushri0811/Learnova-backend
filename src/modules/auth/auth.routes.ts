import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ENV } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { strictLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { StudentModel } from '../students/student.model.js';

const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().optional(),
      username: z.string().trim().optional(),
      password: z.string().min(1, 'Password is required'),
    })
    .refine((data) => Boolean((data.email && data.email.length > 0) || (data.username && data.username.length > 0)), {
      message: 'Email or username is required',
    }),
});

const router = Router();

router.post(
  '/login',
  strictLimiter,
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const rawIdentifier = (req.body.username || req.body.email || '').trim();
    const identifier = rawIdentifier.toLowerCase();
    const password = req.body.password;

    // 1. Check Administrator credentials
    const adminEmail = ENV.ADMIN_EMAIL.trim().toLowerCase();
    if (identifier === adminEmail) {
      if (password !== ENV.ADMIN_PASSWORD) {
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
      return;
    }

    // Prefer the submitted identifier field so a guardian email matching another
    // student's username cannot authenticate the wrong account.
    const studentLookup = req.body.username
      ? { username: identifier }
      : { guardianEmail: identifier };
    const student = await StudentModel.findOne({
      ...studentLookup,
      isArchived: false,
    }).select('+passwordHash');

    if (student && student.passwordHash) {
      const isMatch = await bcrypt.compare(password, student.passwordHash);
      if (isMatch) {
        const studentUser = {
          id: student._id.toString(),
          email: student.guardianEmail || `${student.username || 'student'}@learnova.local`,
          name: student.name,
          username: student.username,
          gradeLevel: student.gradeLevel,
          role: 'student' as const,
        };

        const token = jwt.sign(studentUser, ENV.JWT_SECRET, {
          expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        });

        res.status(200).json({
          status: 'success',
          token,
          user: studentUser,
        });
        return;
      }
    }

    // Generic invalid credential failure
    res.status(401).json({
      status: 'fail',
      message: 'Invalid username/email or password',
    });
  }
);

router.get('/me', authenticate, (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'success',
    user: req.user,
  });
});

export const authRouter = router;
