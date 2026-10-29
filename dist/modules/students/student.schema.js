import { z } from 'zod';
export const createStudentSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Student name must have at least 2 characters').max(100),
        gradeLevel: z.string().regex(/^Class\s(10|[1-9])$/, 'Grade must be in format "Class 1" to "Class 10"'),
        guardianName: z.string().min(2, 'Guardian name must have at least 2 characters').max(100),
        guardianPhone: z.string().min(7, 'Phone number must be at least 7 digits').max(20),
        guardianEmail: z.string().email('Invalid guardian email').optional(),
        academicNotes: z.string().max(1000).optional(),
    }),
});
export const updateStudentSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Student ID parameter is required'),
    }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        gradeLevel: z.string().regex(/^Class\s(10|[1-9])$/).optional(),
        guardianName: z.string().min(2).max(100).optional(),
        guardianPhone: z.string().min(7).max(20).optional(),
        guardianEmail: z.string().email().optional(),
        academicNotes: z.string().max(1000).optional(),
    }),
});
export const getStudentsQuerySchema = z.object({
    query: z.object({
        includeArchived: z.enum(['true', 'false']).optional(),
        gradeLevel: z.string().optional(),
        search: z.string().optional(),
    }),
});
export const studentIdParamSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Student ID is required'),
    }),
});
