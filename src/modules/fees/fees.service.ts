
import mongoose from 'mongoose';
import { StudentFeeModel } from './fees.model.js';
import { StudentModel } from '../students/student.model.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

interface CreateFeeInput {
    studentId: string;
    academicMonth: string;
    totalAmount: number;
    dueDate: string;
}

interface RecordPaymentInput {
    amount: number;
    paymentDate: string;
    method: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'other';
    transactionReference?: string;
    remarks?: string;
}

interface UpdateFeeInput {
    totalAmount?: number;
    dueDate?: string;
}

type FeeStatus = 'paid' | 'pending' | 'partial' | 'overdue';

const getPaidAmount = (fee: {
    payments: Array<{ amount: number }>;
}): number =>
    Math.round(
        fee.payments.reduce((sum, payment) => sum + payment.amount, 0) * 100,
    ) / 100;

const getFeeStatus = (
    totalAmount: number,
    paidAmount: number,
    dueDate: Date,
): FeeStatus => {
    if (paidAmount >= totalAmount) return 'paid';
    if (paidAmount > 0) return 'partial';
    if (dueDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
        return 'overdue';
    }
    return 'pending';
};

const toFeeResponse = (fee: any) => {
    const paidAmount = getPaidAmount(fee);
    const pendingAmount =
        Math.round((fee.totalAmount - paidAmount) * 100) / 100;

    return {
        ...fee.toObject(),
        paidAmount,
        pendingAmount,
        status: getFeeStatus(
            fee.totalAmount,
            paidAmount,
            fee.dueDate,
        ),
    };
};

export const createFee = async (input: CreateFeeInput) => {
    if (!mongoose.isValidObjectId(input.studentId)) {
        throw new BadRequestError('Invalid student ID');
    }

    const student = await StudentModel.findById(input.studentId);

    if (!student || student.isArchived) {
        throw new NotFoundError('Active student not found');
    }

    try {
        const fee = await StudentFeeModel.create({
            studentId: student._id,
            academicMonth: input.academicMonth,
            totalAmount: input.totalAmount,
            dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
            payments: [],
        });

        return toFeeResponse(fee);
    } catch (error) {
        if (
            error instanceof mongoose.mongo.MongoServerError &&
            error.code === 11000
        ) {
            throw new BadRequestError(
                'A fee record already exists for this student and month',
            );
        }

        throw error;
    }
};

export const getFees = async (filters: {
    studentId?: string;
    academicMonth?: string;
}) => {
    const query: Record<string, unknown> = {};

    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.academicMonth) query.academicMonth = filters.academicMonth;

    const fees = await StudentFeeModel.find(query)
        .populate('studentId', 'name gradeLevel isArchived')
        .sort({ academicMonth: -1, dueDate: 1 })
        .exec();

    return fees.map(toFeeResponse);
};

export const getFeeById = async (id: string) => {
    const fee = await StudentFeeModel.findById(id)
        .populate('studentId', 'name gradeLevel isArchived')
        .exec();

    if (!fee) throw new NotFoundError('Fee record not found');

    return toFeeResponse(fee);
};

export const recordPayment = async (
    id: string,
    input: RecordPaymentInput,
) => {
    const fee = await StudentFeeModel.findById(id);

    if (!fee) throw new NotFoundError('Fee record not found');

    const paidAmount = getPaidAmount(fee);

    if (input.amount > fee.totalAmount - paidAmount + 0.001) {
        throw new BadRequestError(
            'Payment exceeds the remaining fee balance',
        );
    }

    fee.payments.push({
        amount: input.amount,
        paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`),
        method: input.method,
        ...(input.transactionReference
            ? { transactionReference: input.transactionReference }
            : {}),
        ...(input.remarks ? { remarks: input.remarks } : {}),
        recordedAt: new Date(),
    });

    await fee.save();

    return toFeeResponse(fee);
};

export const updateFee = async (
    id: string,
    input: UpdateFeeInput,
) => {
    const fee = await StudentFeeModel.findById(id);

    if (!fee) throw new NotFoundError('Fee record not found');

    const paidAmount = getPaidAmount(fee);

    if (
        input.totalAmount !== undefined &&
        input.totalAmount < paidAmount
    ) {
        throw new BadRequestError(
            'Total fee cannot be lower than the amount already paid',
        );
    }

    if (input.totalAmount !== undefined) {
        fee.totalAmount = input.totalAmount;
    }

    if (input.dueDate !== undefined) {
        fee.dueDate = new Date(`${input.dueDate}T00:00:00.000Z`);
    }

    await fee.save();

    return toFeeResponse(fee);
};
