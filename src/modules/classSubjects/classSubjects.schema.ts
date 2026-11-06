import { z } from 'zod';

const classNumberSchema = z.coerce.number().int().min(1).max(10);
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const subjectNameSchema = z.string().trim().min(1).max(80);

export const getClassSubjectsSchema = z.object({
  query: z.object({ classNumber: classNumberSchema.optional() }),
});

export const getOverviewSchema = z.object({
  query: z.object({ classNumber: classNumberSchema.optional() }),
});

export const createClassSubjectSchema = z.object({
  body: z.object({
    classNumber: classNumberSchema,
    subjectName: subjectNameSchema,
  }).strict(),
});

export const updateClassSubjectSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ subjectName: subjectNameSchema }).strict(),
});

export const subjectStatusSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ isActive: z.boolean() }).strict(),
});

export const deleteClassSubjectSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const getSubjectStudentsSchema = z.object({
  query: z.object({
    classNumber: classNumberSchema.optional(),
    subjectId: objectIdSchema.optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

export const updateMySubjectsSchema = z.object({
  body: z.object({
    subjectIds: z.array(objectIdSchema).max(100),
  }).strict(),
});

export const createSubjectRequestSchema = z.object({
  body: z.object({
    requestedSubjectName: subjectNameSchema,
  }).strict(),
});

export const reviewSubjectRequestSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  }).strict(),
});
