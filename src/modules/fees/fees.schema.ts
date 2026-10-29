
import { z } from 'zod';

const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid student or fee ID');

const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
    .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
        );
    }, 'Invalid calendar date');

const academicMonthSchema = z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must use YYYY-MM format');

const paymentMethodSchema = z.enum([
    'cash',
    'upi',
    'bank_transfer',
    'card',
    'other',
]);

export const createFeeSchema = z.object({
    body: z.object({
        studentId: objectIdSchema,
        academicMonth: academicMonthSchema,
        totalAmount: z.number().positive().max(10000000),
        dueDate: dateSchema,
    }),
});

export const recordPaymentSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        amount: z.number().positive().max(10000000),
        paymentDate: dateSchema,
        method: paymentMethodSchema,
        transactionReference: z.string().trim().max(100).optional(),
        remarks: z.string().trim().max(500).optional(),
    }),
});

export const updateFeeSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        totalAmount: z.number().positive().max(10000000).optional(),
        dueDate: dateSchema.optional(),
    }).refine(
        (body) => body.totalAmount !== undefined || body.dueDate !== undefined,
        'Provide at least one field to update',
    ),
});

export const getFeesQuerySchema = z.object({
    query: z.object({
        studentId: objectIdSchema.optional(),
        academicMonth: academicMonthSchema.optional(),
        status: z.enum(['paid', 'pending', 'partial', 'overdue']).optional(),
    }),
});

export const feeIdParamSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});
