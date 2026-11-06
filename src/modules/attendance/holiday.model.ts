import mongoose, { Document, Schema } from 'mongoose';

export interface IHoliday extends Document {
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    description: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

HolidaySchema.index({ startDate: 1, endDate: 1 });

export const HolidayModel = mongoose.model<IHoliday>('Holiday', HolidaySchema);
