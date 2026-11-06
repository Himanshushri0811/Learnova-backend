import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminNotification extends Document {
  type: 'ABSENT_STUDENT';
  studentId: mongoose.Types.ObjectId;
  attendanceDate: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminNotificationSchema = new Schema<IAdminNotification>(
  {
    type: { type: String, enum: ['ABSENT_STUDENT'], required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    attendanceDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    message: { type: String, required: true, maxlength: 300 },
    isRead: { type: Boolean, default: false, required: true },
    isResolved: { type: Boolean, default: false, required: true },
  },
  { timestamps: true }
);

AdminNotificationSchema.index({ studentId: 1, attendanceDate: 1 }, { unique: true });
AdminNotificationSchema.index({ isResolved: 1, createdAt: -1 });

export const AdminNotificationModel = mongoose.model<IAdminNotification>(
  'AdminNotification',
  AdminNotificationSchema
);
