import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { studentRouter } from '../modules/students/student.routes.js';
import { enquiryRouter } from '../modules/enquiry/enquiry.routes.js';
import { BadRequestError } from '../utils/errors.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { attendanceRouter } from '../modules/attendance/attendance.routes.js';
import { feesRouter } from '../modules/fees/fees.routes.js';
import { isDatabaseConnected } from '../config/database.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  const dbConnected = isDatabaseConnected();
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'Learnova API',
    version: '0.1.0',
    environment: ENV.NODE_ENV,
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

router.use('/auth', authRouter);
router.use('/attendance', attendanceRouter);
router.use('/fees', feesRouter);

// Admissions Enquiry (Public)
router.use('/enquiry', enquiryRouter);

// Students Module (Protected CRUD Foundation)
router.use('/students', studentRouter);

// Development Token Generator (For testing server-side role verification)
if (ENV.NODE_ENV !== 'production') {
  router.post('/auth/demo-token', (req: Request, res: Response) => {
    const role = req.body.role;
    if (!['admin', 'student', 'guardian'].includes(role)) {
      throw new BadRequestError('Invalid demo role. Choose admin, student, or guardian.');
    }

    const payload = {
      id: `usr_${role}_001`,
      email: `${role}@learnova.local`,
      role,
      linkedStudentIds: role === 'guardian' ? ['std_01'] : undefined,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.status(200).json({
      status: 'success',
      token,
      user: payload,
    });
  });
}

export const apiRouter = router;
