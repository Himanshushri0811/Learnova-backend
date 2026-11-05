import { z } from 'zod';
export const createStudentSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Student name must have at least 2 characters').max(100),
        gradeLevel: z.string().regex(/^Class\s(10|[1-9])$/, 'Grade must be in format "Class 1" to "Class 10"').optional().or(z.literal('')),
        guardianName: z.string().min(2, 'Guardian name must have at least 2 characters').max(100).optional().or(z.literal('')),
        guardianPhone: z.string().min(7, 'Phone number must be at least 7 digits').max(20).optional().or(z.literal('')),
        guardianEmail: z.string().email('Invalid guardian email').optional().or(z.literal('')),
        academicNotes: z.string().max(1000).optional(),
        fatherName: z.string().max(100).optional().or(z.literal('')),
        motherName: z.string().max(100).optional().or(z.literal('')),
        address: z.string().max(500).optional().or(z.literal('')),
        profilePhoto: z.string().max(350000).regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).optional().or(z.literal('')),
        username: z.string().min(4, 'Username must be at least 4 characters').max(30).optional().or(z.literal('')),
        password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional().or(z.literal('')),
    }),
});
export const updateOwnStudentProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        gradeLevel: z.string().regex(/^Class\s(10|[1-9])$/).optional().or(z.literal('')),
        guardianName: z.string().min(2).max(100).optional().or(z.literal('')),
        guardianPhone: z.string().min(7).max(20).optional().or(z.literal('')),
        guardianEmail: z.string().email().optional().or(z.literal('')),
        academicNotes: z.string().max(1000).optional(),
        fatherName: z.string().max(100).optional().or(z.literal('')),
        motherName: z.string().max(100).optional().or(z.literal('')),
        address: z.string().max(500).optional().or(z.literal('')),
        profilePhoto: z.string().max(350000).regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).optional().or(z.literal('')),
    }).strict().refine((body) => Object.keys(body).length > 0, {
        message: 'At least one profile field must be provided',
    }),
});
export const changeOwnStudentPasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1).max(128),
        newPassword: z.string().min(12).max(128),
    }).strict(),
});
export const updateStudentSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Student ID parameter is required'),
    }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        gradeLevel: z.string().regex(/^Class\s(10|[1-9])$/).optional().or(z.literal('')),
        guardianName: z.string().min(2).max(100).optional().or(z.literal('')),
        guardianPhone: z.string().min(7).max(20).optional().or(z.literal('')),
        guardianEmail: z.string().email().optional().or(z.literal('')),
        academicNotes: z.string().max(1000).optional(),
        fatherName: z.string().max(100).optional(),
        motherName: z.string().max(100).optional(),
        address: z.string().max(500).optional(),
        username: z.string().min(4).max(30).optional().or(z.literal('')),
        password: z.string().min(8).max(128).optional().or(z.literal('')),
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
