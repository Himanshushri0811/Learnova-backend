import mongoose, { Document, Schema } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface IAttendance extends Document {
    studentId: mongoose.Types.ObjectId;
    date: string;
    status: AttendanceStatus;
    remarks?: string;
    markedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        date: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/,
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'leave'],
            required: true,
        },
        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        markedBy: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

AttendanceSchema.index(
    { studentId: 1, date: 1 },
    { unique: true }
);

export const AttendanceModel = mongoose.model<IAttendance>(
    'Attendance',
    AttendanceSchema
);