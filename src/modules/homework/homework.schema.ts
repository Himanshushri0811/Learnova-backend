import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}, 'Enter a valid calendar date');

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(120).regex(/^[^\\/:*?"<>|\u0000-\u001f]+$/),
  contentType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  size: z.number().int().positive().max(300 * 1024),
  data: z.string().max(410000).regex(/^data:[^;,]+;base64,[A-Za-z0-9+/]+={0,2}$/),
}).strict();
const attachmentsSchema = z.array(attachmentSchema).max(5);

const createHomeworkBody = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
  classNumber: z.coerce.number().int().min(1).max(10).optional(),
  subjectId: objectIdSchema.optional(),
  assignedDate: dateSchema,
  dueDate: dateSchema,
  assignmentType: z.enum(['CLASS', 'INDIVIDUAL', 'ALL_STUDENTS']),
  targetStudentIds: z.array(objectIdSchema).max(5000).optional().default([]),
  sourceAttendanceDate: dateSchema.optional(),
  attachments: attachmentsSchema.default([]),
}).strict().refine(({ assignedDate, dueDate }) => dueDate >= assignedDate, {
  message: 'Due date must be on or after the assigned date',
  path: ['dueDate'],
}).refine((body) => body.assignmentType !== 'INDIVIDUAL' || body.targetStudentIds.length > 0, {
  message: 'Select at least one student for individual homework',
  path: ['targetStudentIds'],
}).refine((body) => !body.sourceAttendanceDate || body.assignmentType === 'INDIVIDUAL', {
  message: 'Absent-student homework must be individual',
  path: ['assignmentType'],
}).refine((body) => body.assignmentType !== 'CLASS' || body.targetStudentIds.length === 0, {
  message: 'Class homework does not accept an individual recipient list',
  path: ['targetStudentIds'],
}).refine((body) => body.assignmentType === 'ALL_STUDENTS' || (
  body.classNumber !== undefined && body.subjectId !== undefined
), {
  message: 'Select a class and one of its subjects for class or individual homework',
  path: ['classNumber'],
}).refine((body) => body.assignmentType !== 'ALL_STUDENTS' || (
  body.classNumber === undefined && body.subjectId === undefined &&
  body.targetStudentIds.length === 0 && body.sourceAttendanceDate === undefined
), {
  message: 'Common homework for all students does not use a class, subject, or individual list',
  path: ['assignmentType'],
});

export const createHomeworkSchema = z.object({ body: createHomeworkBody });

export const updateHomeworkSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    dueDate: dateSchema.optional(),
    attachments: attachmentsSchema.optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one homework field must be provided',
  }),
});

export const homeworkIdSchema = z.object({ params: z.object({ id: objectIdSchema }) });

export const getHomeworkQuerySchema = z.object({
  query: z.object({
    date: dateSchema.optional(),
    classNumber: z.coerce.number().int().min(1).max(10).optional(),
    subjectId: objectIdSchema.optional(),
    studentId: objectIdSchema.optional(),
    status: z.enum(['PENDING', 'COMPLETED', 'SUBMITTED', 'OVERDUE']).optional(),
  }),
});

export const notificationQuerySchema = z.object({
  query: z.object({ includeResolved: z.enum(['true', 'false']).optional() }),
});

export const updateNotificationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    isRead: z.boolean().optional(),
    isResolved: z.boolean().optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: 'Provide a notification field to update',
  }),
});

export const submitHomeworkSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    files: attachmentsSchema.max(3).default([]),
  }).strict(),
});
