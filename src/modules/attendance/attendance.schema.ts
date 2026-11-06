import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
    (value) => {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day;
    },
    'Date must be a valid calendar date'
);

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const attendanceEntrySchema = z.object({
    studentId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid student ID'),
    status: z.union([z.enum(['present', 'absent', 'leave']), z.literal('')]),
    remarks: z.string().max(500).optional(),
}).strict();

export const saveAttendanceSchema = z.object({
    body: z.object({
        date: dateSchema,
        entries: z.array(attendanceEntrySchema).max(5000),
    }).strict(),
});

export const getAttendanceSchema = z.object({
    query: z.object({
        date: dateSchema,
    }),
});

export const updateAttendanceSchema = z.object({
    params: z.object({
        studentId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid student ID'),
    }),
    body: z.object({
        date: dateSchema,
        status: z.enum(['present', 'absent', 'leave']),
        remarks: z.string().max(500).optional(),
    }).strict(),
});

export const getMyAttendanceSchema = z.object({
    query: z.object({ month: monthSchema.optional() }),
});

export const getMyHolidaysSchema = getMyAttendanceSchema;

export const getHolidaysSchema = z.object({
    query: z.object({
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
    }).refine(
        ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
        'Start date must be on or before end date'
    ),
});

export const createHolidaySchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(100),
        startDate: dateSchema,
        endDate: dateSchema,
        description: z.string().trim().max(500).optional(),
    }).strict().refine(({ startDate, endDate }) => startDate <= endDate, {
        message: 'End date must be on or after start date',
        path: ['endDate'],
    }),
});

export const updateHolidaySchema = z.object({
    params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid holiday ID') }),
    body: z.object({
        name: z.string().trim().min(1).max(100).optional(),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
        description: z.string().trim().max(500).optional(),
    }).strict().refine((body) => Object.keys(body).length > 0, {
        message: 'At least one holiday field must be provided',
    }),
});

export const holidayIdSchema = z.object({
    params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid holiday ID') }),
});