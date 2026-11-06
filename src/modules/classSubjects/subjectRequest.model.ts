import mongoose, { Document, Schema } from 'mongoose';

export type SubjectRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ISubjectRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  requestedSubjectName: string;
  normalizedSubjectName: string;
  classNumber: number;
  status: SubjectRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectRequestSchema = new Schema<ISubjectRequest>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    requestedSubjectName: { type: String, required: true, trim: true, maxlength: 80 },
    normalizedSubjectName: { type: String, required: true, trim: true, lowercase: true },
    classNumber: { type: Number, required: true, min: 1, max: 10 },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      required: true,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

SubjectRequestSchema.index(
  { studentId: 1, classNumber: 1, normalizedSubjectName: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'PENDING' },
  }
);
SubjectRequestSchema.index({ status: 1, createdAt: 1 });

export const SubjectRequestModel = mongoose.model<ISubjectRequest>(
  'SubjectRequest',
  SubjectRequestSchema
);
