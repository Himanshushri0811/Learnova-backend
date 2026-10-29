import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { strictLimiter } from '../../middleware/rateLimiter.js';

const enquirySchema = z.object({
  body: z.object({
    studentName: z.string().min(2, 'Student name must have at least 2 characters').max(100),
    gradeLevel: z.string().min(1, 'Grade level is required'),
    guardianName: z.string().min(2, 'Guardian name must have at least 2 characters').max(100),
    phone: z.string().min(7, 'Phone number must have at least 7 characters').max(20),
    message: z.string().max(1000).optional(),
  }),
});

const router = Router();

router.post(
  '/',
  strictLimiter,
  validate(enquirySchema),
  async (req: Request, res: Response) => {
    // In foundation phase, log enquiry safely without storing plaintext sensitive secrets
    const { studentName, gradeLevel, guardianName, phone, message } = req.body;

    console.log(`[Tuition Enquiry Received] Student: ${studentName} (${gradeLevel}), Guardian: ${guardianName}`);

    res.status(201).json({
      status: 'success',
      message: 'Admission enquiry received successfully. Our tutor will contact you shortly.',
      data: {
        enquiryId: `enq_${Date.now()}`,
        studentName,
        gradeLevel,
        createdAt: new Date().toISOString(),
      },
    });
  }
);

export const enquiryRouter = router;

