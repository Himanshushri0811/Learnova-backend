
import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  gradeLevel: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;

  // Student login credentials
  username?: string;
  passwordHash?: string;

  isArchived: boolean;
  archivedAt?: Date | null;
  academicNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    gradeLevel: {
      type: String,
      required: [true, 'Grade level is required'],
      trim: true,
    },
    guardianName: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true,
    },
    guardianPhone: {
      type: String,
      required: [true, 'Guardian phone is required'],
      trim: true,
    },
    guardianEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      minlength: [4, 'Username must be at least 4 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    passwordHash: {
      type: String,
      select: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    academicNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  },
);

StudentSchema.index({ isArchived: 1, gradeLevel: 1 });

export const StudentModel = mongoose.model<IStudent>(
  'Student',
  StudentSchema,
);
