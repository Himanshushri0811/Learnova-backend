import mongoose from 'mongoose';
import { AttendanceModel } from '../attendance/attendance.model.js';
import { StudentModel } from '../students/student.model.js';
import { AdminNotificationModel } from './adminNotification.model.js';

export class AdminNotificationService {
  static async syncAbsentAttendance(
    date: string,
    entries: Array<{ studentId: string; status: 'present' | 'absent' | 'leave' | '' }>
  ) {
    const ids = entries.map((entry) => new mongoose.Types.ObjectId(entry.studentId));
    if (!ids.length) return;

    const attendance = await AttendanceModel.find({
      studentId: { $in: ids },
      date,
    }).select('studentId status').lean();
    const absentIds = attendance
      .filter((record) => record.status === 'absent')
      .map((record) => record.studentId);
    const absentStudents = absentIds.length
      ? await StudentModel.find({ _id: { $in: absentIds }, isArchived: false })
        .select('_id name gradeLevel')
        .lean()
      : [];
    const studentById = new Map(absentStudents.map((student) => [student._id.toString(), student]));
    const operations = entries.map((entry) => {
      const studentId = new mongoose.Types.ObjectId(entry.studentId);
      const student = studentById.get(studentId.toString());
      if (student) {
        return {
          updateOne: {
            filter: { studentId, attendanceDate: date },
            update: {
              $set: {
                type: 'ABSENT_STUDENT' as const,
                message: `${student.name} (${student.gradeLevel || 'Class not set'}) was marked absent on ${date}.`,
                isResolved: false,
              },
              $setOnInsert: { isRead: false },
            },
            upsert: true,
          },
        };
      }
      return {
        updateOne: {
          filter: { studentId, attendanceDate: date },
          update: { $set: { isResolved: true } },
          upsert: false,
        },
      };
    });
    try {
      await AdminNotificationModel.bulkWrite(operations, { ordered: false });
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 11000
      ) throw error;

      await AdminNotificationModel.bulkWrite(
        operations.map((operation) => ({
          updateOne: {
            filter: operation.updateOne.filter,
            update: operation.updateOne.update,
            upsert: false,
          },
        })),
        { ordered: false }
      );
    }
  }
}
