import mongoose, { Document, Schema } from 'mongoose';

export type HomeworkAssignmentType = 'CLASS' | 'INDIVIDUAL' | 'ALL_STUDENTS';
export type HomeworkStatus = 'PENDING' | 'COMPLETED' | 'SUBMITTED' | 'OVERDUE';

export interface IHomeworkAttachment {
  name: string;
  contentType: string;
  size: number;
  data: string;
}

export interface IHomework extends Document {
  title: string;
  description: string;
  classNumber?: number | null;
  subjectId?: mongoose.Types.ObjectId | null;
  taskKey: string;
  assignedBy: string;
  assignedDate: string;
  dueDate: string;
  assignmentType: HomeworkAssignmentType;
  targetStudentIds: mongoose.Types.ObjectId[];
  sourceAttendanceDate?: string;
  attachments: IHomeworkAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentHomework extends Document {
  homeworkId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: HomeworkStatus;
  submissionFiles: IHomeworkAttachment[];
  completedAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IHomeworkAttachment>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 1, max: 300 * 1024 },
    data: { type: String, required: true },
  },
  { _id: false }
);

const HomeworkSchema = new Schema<IHomework>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    classNumber: { type: Number, min: 1, max: 10 },
    subjectId: { type: Schema.Types.ObjectId, ref: 'ClassSubject' },
    taskKey: { type: String, required: true },
    assignedBy: { type: String, required: true },
    assignedDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    assignmentType: { type: String, enum: ['CLASS', 'INDIVIDUAL', 'ALL_STUDENTS'], required: true },
    targetStudentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', required: true }],
    sourceAttendanceDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true }
);

HomeworkSchema.index({ assignedDate: -1, classNumber: 1, subjectId: 1 });
HomeworkSchema.index({ targetStudentIds: 1, assignedDate: -1 });
HomeworkSchema.index({ taskKey: 1 }, { unique: true });

const StudentHomeworkSchema = new Schema<IStudentHomework>(
  {
    homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'SUBMITTED', 'OVERDUE'],
      default: 'PENDING',
      required: true,
    },
    submissionFiles: { type: [attachmentSchema], default: [] },
    completedAt: { type: Date },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

StudentHomeworkSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });
StudentHomeworkSchema.index({ studentId: 1, status: 1, updatedAt: -1 });

export const HomeworkModel = mongoose.model<IHomework>('Homework', HomeworkSchema);
export const StudentHomeworkModel = mongoose.model<IStudentHomework>(
  'StudentHomework',
  StudentHomeworkSchema
);
