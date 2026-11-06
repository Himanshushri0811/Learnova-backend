import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { EnquiryModel, EnquiryStatus } from './enquiry.model.js';

export interface CreateEnquiryInput {
  parentName: string;
  studentName: string;
  phone: string;
  email?: string;
  classNumber: number;
  board?: 'CBSE' | 'UP_BOARD';
  subject?: string;
  message?: string;
  preferredContactTime?: string;
}

export class EnquiryService {
  static async create(input: CreateEnquiryInput) {
    return EnquiryModel.create({
      ...input,
      parentName: input.parentName.trim(),
      studentName: input.studentName.trim(),
      phone: input.phone,
      email: input.email?.trim().toLowerCase() || undefined,
      subject: input.subject?.trim() || undefined,
      message: input.message?.trim() || undefined,
      preferredContactTime: input.preferredContactTime?.trim() || undefined,
      status: 'NEW',
      adminNotes: '',
      isRead: false,
    });
  }

  static async list(filters: {
    search?: string;
    classNumber?: number;
    status?: EnquiryStatus;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.classNumber) query.classNumber = filters.classNumber;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { parentName: new RegExp(escaped, 'i') },
        { studentName: new RegExp(escaped, 'i') },
        { phone: new RegExp(escaped.replace(/\D/g, ''), 'i') },
      ];
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {
        ...(filters.startDate ? { $gte: new Date(`${filters.startDate}T00:00:00.000+05:30`) } : {}),
        ...(filters.endDate ? { $lte: new Date(`${filters.endDate}T23:59:59.999+05:30`) } : {}),
      };
    }
    const [enquiries, total] = await Promise.all([
      EnquiryModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit)
        .lean(),
      EnquiryModel.countDocuments(query),
    ]);
    return {
      enquiries,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  static async stats() {
    const [grouped, unread] = await Promise.all([
      EnquiryModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      EnquiryModel.countDocuments({ isRead: false }),
    ]);
    const counts: Record<string, number> = Object.fromEntries(
      grouped.map((item) => [item._id, Number(item.count)])
    );
    return {
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      new: counts.NEW ?? 0,
      contacted: counts.CONTACTED ?? 0,
      admissionConfirmed: counts.ADMISSION_CONFIRMED ?? 0,
      notInterested: counts.NOT_INTERESTED ?? 0,
      unread,
    };
  }

  static async getById(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid enquiry ID');
    const enquiry = await EnquiryModel.findByIdAndUpdate(
      id,
      { $set: { isRead: true }, $currentDate: { readAt: true } },
      { new: true, runValidators: true }
    ).lean();
    if (!enquiry) throw new NotFoundError('Enquiry not found');
    return enquiry;
  }

  static async update(id: string, updates: {
    status?: EnquiryStatus;
    adminNotes?: string;
    isRead?: boolean;
  }, adminId: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid enquiry ID');
    const set: Record<string, unknown> = { ...updates, updatedBy: adminId };
    if (updates.isRead === true) set.readAt = new Date();
    if (updates.isRead === false) set.readAt = null;
    const enquiry = await EnquiryModel.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true }
    ).lean();
    if (!enquiry) throw new NotFoundError('Enquiry not found');
    return enquiry;
  }

  static async markRead(ids: string[]) {
    const invalid = ids.find((id) => !mongoose.isValidObjectId(id));
    if (invalid) throw new BadRequestError('Invalid enquiry ID');
    const result = await EnquiryModel.updateMany(
      { _id: { $in: ids } },
      { $set: { isRead: true }, $currentDate: { readAt: true } }
    );
    return { updatedCount: result.modifiedCount };
  }

  static async delete(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid enquiry ID');
    const enquiry = await EnquiryModel.findByIdAndDelete(id);
    if (!enquiry) throw new NotFoundError('Enquiry not found');
  }
}
