
import mongoose, { Document, Schema, Types } from 'mongoose';

export type FeePaymentMethod =
    | 'cash'
    | 'upi'
    | 'bank_transfer'
    | 'card'
    | 'other';

export interface IFeePayment {
    amount: number;
    paymentDate: Date;
    method: FeePaymentMethod;
    transactionReference?: string;
    remarks?: string;
    recordedAt: Date;
}

export interface IStudentFee extends Document {
    studentId: Types.ObjectId;
    academicMonth: string;
    totalAmount: number;
    dueDate: Date;
    payments: IFeePayment[];
    createdAt: Date;
    updatedAt: Date;
}

const FeePaymentSchema = new Schema<IFeePayment>(
    {
        amount: {
            type: Number,
            required: [true, 'Payment amount is required'],
            min: [0.01, 'Payment amount must be greater than zero'],
        },
        paymentDate: {
            type: Date,
            required: [true, 'Payment date is required'],
        },
        method: {
            type: String,
            enum: ['cash', 'upi', 'bank_transfer', 'card', 'other'],
            required: [true, 'Payment method is required'],
        },
        transactionReference: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        recordedAt: {
            type: Date,
            default: Date.now,
            immutable: true,
        },
    },
    { _id: true }
);

const StudentFeeSchema = new Schema<IStudentFee>(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Student',
            required: [true, 'Student ID is required'],
            index: true,
        },
        academicMonth: {
            type: String,
            required: [true, 'Academic month is required'],
            match: [
                /^\d{4}-(0[1-9]|1[0-2])$/,
                'Academic month must use YYYY-MM format',
            ],
            trim: true,
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total fee amount is required'],
            min: [0.01, 'Total fee must be greater than zero'],
        },
        dueDate: {
            type: Date,
            required: [true, 'Fee due date is required'],
        },
        payments: {
            type: [FeePaymentSchema],
            default: [],
        },
    },
    { timestamps: true }
);

// One monthly fee record per student.
StudentFeeSchema.index(
    { studentId: 1, academicMonth: 1 },
    { unique: true }
);

StudentFeeSchema.index({ dueDate: 1 });

export const StudentFeeModel = mongoose.model<IStudentFee>(
    'StudentFee',
    StudentFeeSchema
);
