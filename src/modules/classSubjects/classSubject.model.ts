import mongoose, { Document, Schema } from 'mongoose';

export interface IClassSubject extends Document {
  classNumber: number;
  subjectName: string;
  normalizedSubjectName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSubjectSchema = new Schema<IClassSubject>(
  {
    classNumber: { type: Number, required: true, min: 1, max: 10 },
    subjectName: { type: String, required: true, trim: true, maxlength: 80 },
    normalizedSubjectName: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true }
);

ClassSubjectSchema.index(
  { classNumber: 1, normalizedSubjectName: 1 },
  { unique: true }
);
ClassSubjectSchema.index({ classNumber: 1, isActive: 1, subjectName: 1 });

export const ClassSubjectModel = mongoose.model<IClassSubject>(
  'ClassSubject',
  ClassSubjectSchema
);
