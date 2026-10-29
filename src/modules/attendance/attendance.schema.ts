import { z } from 'zod';

const dateSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must use YYYY-MM-DD format'
);

const attendanceEntrySchema = z.object({
    studentId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid student ID'),
    status: z.enum(['present', 'absent', 'leave']),
    remarks: z.string().max(500).optional(),
});

export const saveAttendanceSchema = z.object({
    body: z.object({
        date: dateSchema,
        entries: z.array(attendanceEntrySchema).min(1).max(500),
    }),
});

export const getAttendanceSchema = z.object({
    query: z.object({
        date: dateSchema,
    }),
});