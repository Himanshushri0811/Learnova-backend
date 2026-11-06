import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentSubjectSelection extends Document {
  studentId: mongoose.Types.ObjectId;
  classNumber: number;
  subjectIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentSubjectSelectionSchema = new Schema<IStudentSubjectSelection>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    classNumber: { type: Number, required: true, min: 1, max: 10 },
    subjectIds: [{
      type: Schema.Types.ObjectId,
      ref: 'ClassSubject',
    }],
  },
  { timestamps: true }
);

StudentSubjectSelectionSchema.index({ studentId: 1 }, { unique: true });
StudentSubjectSelectionSchema.index({ classNumber: 1, subjectIds: 1 });

export const StudentSubjectSelectionModel = mongoose.model<IStudentSubjectSelection>(
  'StudentSubjectSelection',
  StudentSubjectSelectionSchema
);
