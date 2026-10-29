import mongoose from 'mongoose';
import { AttendanceModel } from './attendance.model.js';
import { StudentModel } from '../students/student.model.js';
import { BadRequestError } from '../../utils/errors.js';

interface AttendanceEntryInput {
    studentId: string;
    status: 'present' | 'absent' | 'leave';
    remarks?: string;
}

export class AttendanceService {
    static async getByDate(date: string) {
        const students = await StudentModel.find({ isArchived: false })
            .select('_id name gradeLevel')
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

        await AttendanceModel.bulkWrite(
            entries.map((entry) => ({
                updateOne: {
                    filter: {
                        studentId: new mongoose.Types.ObjectId(entry.studentId),
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
            })),
            { ordered: true }
        );

        return this.getByDate(date);
    }
}