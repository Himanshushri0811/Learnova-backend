import mongoose, { Document, Schema } from 'mongoose';

export type EnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'ADMISSION_CONFIRMED'
  | 'NOT_INTERESTED';

export type EnquiryBoard = 'CBSE' | 'UP_BOARD';

export interface IEnquiry extends Document {
  parentName: string;
  studentName: string;
  phone: string;
  email?: string;
  classNumber: number;
  board?: EnquiryBoard;
  subject?: string;
  message?: string;
  preferredContactTime?: string;
  status: EnquiryStatus;
  adminNotes: string;
  isRead: boolean;
  readAt?: Date;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema = new Schema<IEnquiry>(
  {
    parentName: { type: String, required: true, trim: true, maxlength: 100 },
    studentName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    classNumber: { type: Number, required: true, min: 1, max: 10 },
    board: { type: String, enum: ['CBSE', 'UP_BOARD'] },
    subject: { type: String, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 2000 },
    preferredContactTime: { type: String, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'ADMISSION_CONFIRMED', 'NOT_INTERESTED'],
      default: 'NEW',
      required: true,
    },
    adminNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    isRead: { type: Boolean, default: false, required: true },
    readAt: { type: Date },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

EnquirySchema.index({ createdAt: -1 });
EnquirySchema.index({ status: 1, createdAt: -1 });
EnquirySchema.index({ isRead: 1, createdAt: -1 });
EnquirySchema.index({ classNumber: 1, status: 1, createdAt: -1 });
EnquirySchema.index({ parentName: 'text', studentName: 'text', phone: 'text' });

export const EnquiryModel = mongoose.model<IEnquiry>('Enquiry', EnquirySchema);
