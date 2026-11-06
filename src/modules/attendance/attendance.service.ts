import mongoose from 'mongoose';
import { AttendanceModel } from './attendance.model.js';
import { HolidayModel } from './holiday.model.js';
import { StudentModel } from '../students/student.model.js';
import { AdminNotificationService } from '../homework/adminNotification.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

interface AttendanceEntryInput {
    studentId: string;
    status: 'present' | 'absent' | 'leave' | '';
    remarks?: string;
}

const getIndiaDate = (): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

const getMonthRange = (month: string) => ({
    startDate: `${month}-01`,
    endDate: `${month}-${new Date(
        Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
    ).getUTCDate().toString().padStart(2, '0')}`,
});

export class AttendanceService {
    static async getByDate(date: string) {
        const students = await StudentModel.find({ isArchived: false })
            .select('_id name username gradeLevel')
            .sort({ name: 1 })
            .lean();

        const records = await AttendanceModel.find({ date }).lean();
        const recordMap = new Map(
            records.map((record) => [record.studentId.toString(), record])
        );

        return students.map((student) => ({
            student,
            attendance: recordMap.get(student._id.toString()) ?? null,
        }));
    }

    static async saveForDate(
        date: string,
        entries: AttendanceEntryInput[],
        markedBy: string
    ) {
        this.assertNotFutureDate(date);
        const ids = entries.map((entry) => entry.studentId);

        if (new Set(ids).size !== ids.length) {
            throw new BadRequestError('Duplicate student IDs in attendance request');
        }

        const validIds = ids.every((id) => mongoose.isValidObjectId(id));
        if (!validIds) {
            throw new BadRequestError('Invalid student ID');
        }

        const students = await StudentModel.find({
            _id: { $in: ids },
            isArchived: false,
        }).select('_id');

        if (students.length !== ids.length) {
            throw new BadRequestError(
                'One or more students do not exist or are archived'
            );
        }

        await this.assertDateIsNotHoliday(date);

        const operations = entries.map((entry) => {
            const studentId = new mongoose.Types.ObjectId(entry.studentId);
            if (entry.status === '') {
                return {
                    deleteOne: {
                        filter: { studentId, date },
                    },
                };
            }

            return {
                updateOne: {
                    filter: {
                        studentId,
                        date,
                    },
                    update: {
                        $set: {
                            status: entry.status,
                            remarks: entry.remarks?.trim() ?? '',
                            markedBy,
                        },
                    },
                    upsert: true,
                },
            };
        });

        if (operations.length > 0) {
            await AttendanceModel.bulkWrite(operations, { ordered: true });
        }

        await AdminNotificationService.syncAbsentAttendance(date, entries);
        return this.getByDate(date);
    }

    static async updateStudentAttendance(
        studentId: string,
        date: string,
        status: 'present' | 'absent' | 'leave',
        markedBy: string,
        remarks?: string
    ) {
        return this.saveForDate(date, [{ studentId, status, remarks }], markedBy);
    }

    static async getAttendanceForStudent(studentId: string, month?: string) {
        if (!mongoose.isValidObjectId(studentId)) {
            throw new BadRequestError('Invalid student ID');
        }

        const allRecords = await AttendanceModel.find({
            studentId: new mongoose.Types.ObjectId(studentId),
        })
            .sort({ date: -1 })
            .lean();

        const allHolidays = allRecords.length
            ? await HolidayModel.find({
                startDate: { $lte: allRecords[0].date },
                endDate: { $gte: allRecords[allRecords.length - 1].date },
            }).lean()
            : [];
        const nonHolidayRecords = allRecords.filter(
            (record) =>
                !allHolidays.some(
                    (holiday) =>
                        record.date >= holiday.startDate &&
                        record.date <= holiday.endDate
                )
        );
        const present = nonHolidayRecords.filter((r) => r.status === 'present').length;
        const absent = nonHolidayRecords.filter((r) => r.status === 'absent').length;
        const leave = nonHolidayRecords.filter((r) => r.status === 'leave').length;
        const total = present + absent + leave;
        const percentage = total > 0
            ? Math.round((present / total) * 10000) / 100
            : 0;
        const records = month
            ? allRecords.filter((record) => record.date.startsWith(`${month}-`))
            : allRecords;

        return {
            summary: {
                total,
                present,
                absent,
                leave,
                percentage,
            },
            records,
        };
    }

    static async getHolidays(startDate?: string, endDate?: string) {
        const filter = startDate && endDate
            ? { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
            : {};
        return HolidayModel.find(filter).sort({ startDate: 1 }).lean();
    }

    static async createHoliday(
        input: { name: string; startDate: string; endDate: string; description?: string },
        createdBy: string
    ) {
        await this.assertNoHolidayOverlap(input.startDate, input.endDate);
        return HolidayModel.create({ ...input, createdBy });
    }

    static async updateHoliday(
        id: string,
        updates: { name?: string; startDate?: string; endDate?: string; description?: string }
    ) {
        const holiday = await HolidayModel.findById(id);
        if (!holiday) throw new NotFoundError('Holiday not found');

        const startDate = updates.startDate ?? holiday.startDate;
        const endDate = updates.endDate ?? holiday.endDate;
        if (startDate > endDate) {
            throw new BadRequestError('End date must be on or after start date');
        }
        await this.assertNoHolidayOverlap(startDate, endDate, id);

        Object.assign(holiday, updates);
        await holiday.save();
        return holiday;
    }

    static async deleteHoliday(id: string) {
        const holiday = await HolidayModel.findByIdAndDelete(id);
        if (!holiday) throw new NotFoundError('Holiday not found');
        return holiday;
    }

    static async getStudentHolidays(month?: string) {
        if (!month) return this.getHolidays();
        const { startDate, endDate } = getMonthRange(month);
        return this.getHolidays(startDate, endDate);
    }

    private static assertNotFutureDate(date: string) {
        if (date > getIndiaDate()) {
            throw new BadRequestError('Attendance cannot be marked for a future date');
        }
    }

    private static async assertDateIsNotHoliday(date: string) {
        const holiday = await HolidayModel.findOne({
            startDate: { $lte: date },
            endDate: { $gte: date },
        }).lean();
        if (holiday) {
            throw new BadRequestError(`Attendance cannot be marked on the holiday "${holiday.name}"`);
        }
    }

    private static async assertNoHolidayOverlap(
        startDate: string,
        endDate: string,
        excludeId?: string
    ) {
        if (startDate > endDate) {
            throw new BadRequestError('End date must be on or after start date');
        }
        const filter: Record<string, unknown> = {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
        };
        if (excludeId) filter._id = { $ne: excludeId };
        const overlapping = await HolidayModel.findOne(filter).lean();
        if (overlapping) {
            throw new BadRequestError(
                `Holiday dates overlap with "${overlapping.name}"`
            );
        }
    }
}