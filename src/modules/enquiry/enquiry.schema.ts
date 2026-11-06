import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid enquiry ID');
const statusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'ADMISSION_CONFIRMED',
  'NOT_INTERESTED',
]);

const phoneSchema = z.string().trim().min(7).max(20).transform((phone, context) => {
  const digits = phone.replace(/[\s()-]/g, '').replace(/^\+/, '');
  const normalized = digits.startsWith('91') && digits.length === 12
    ? digits.slice(2)
    : digits;
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a valid 10-digit Indian mobile number',
    });
    return z.NEVER;
  }
  return normalized;
});

export const publicEnquirySchema = z.object({
  body: z.object({
    parentName: z.string().trim().min(2).max(100).optional(),
    guardianName: z.string().trim().min(2).max(100).optional(),
    studentName: z.string().trim().min(2).max(100),
    classNumber: z.coerce.number().int().min(1).max(10).optional(),
    gradeLevel: z.string().regex(/^Class\s*(10|[1-9])$/i).optional(),
    phone: phoneSchema,
    email: z.string().trim().email().max(254).optional().or(z.literal('')),
    board: z.enum(['CBSE', 'UP_BOARD']).optional().or(z.literal('')),
    subject: z.string().trim().max(120).optional(),
    message: z.string().trim().max(2000).optional(),
    preferredContactTime: z.string().trim().max(100).optional(),
    website: z.string().max(200).optional(),
  }).strict().refine((body) => body.parentName || body.guardianName, {
    message: 'Parent or guardian name is required',
    path: ['parentName'],
  }).refine((body) => body.classNumber || body.gradeLevel, {
    message: 'Student class is required',
    path: ['classNumber'],
  }),
});

export const listEnquiriesSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    classNumber: z.coerce.number().int().min(1).max(10).optional(),
    status: statusSchema.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }).refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, {
    message: 'Start date must be on or before end date',
  }),
});

export const enquiryIdSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const updateEnquirySchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    status: statusSchema.optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    isRead: z.boolean().optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: 'Provide enquiry fields to update',
  }),
});

export const bulkMarkReadSchema = z.object({
  body: z.object({ ids: z.array(objectIdSchema).max(500) }).strict(),
});
