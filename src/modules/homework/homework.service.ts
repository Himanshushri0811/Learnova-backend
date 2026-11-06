import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { AttendanceModel } from '../attendance/attendance.model.js';
import { ClassSubjectModel } from '../classSubjects/classSubject.model.js';
import { StudentModel } from '../students/student.model.js';
import { AdminNotificationModel } from './adminNotification.model.js';
import {
  HomeworkModel,
  IHomeworkAttachment,
  StudentHomeworkModel,
} from './homework.model.js';

const getIndiaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

type HomeworkInput = {
  title: string;
  description: string;
  classNumber?: number;
  subjectId?: string;
  assignedDate: string;
  dueDate: string;
  assignmentType: 'CLASS' | 'INDIVIDUAL' | 'ALL_STUDENTS';
  targetStudentIds: string[];
  sourceAttendanceDate?: string;
  attachments: IHomeworkAttachment[];
};

const objectId = (id: string, label: string) => {
  if (!mongoose.isValidObjectId(id)) throw new BadRequestError(`Invalid ${label}`);
  return new mongoose.Types.ObjectId(id);
};

const validateAttachments = (files: IHomeworkAttachment[]) => {
  const allowedTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]);
  let total = 0;
  for (const file of files) {
    const prefix = `data:${file.contentType};base64,`;
    if (!allowedTypes.has(file.contentType) || !file.data.startsWith(prefix)) {
      throw new BadRequestError('Attachment type does not match an allowed file type');
    }
    const encoded = file.data.slice(prefix.length);
    const bytes = Buffer.from(encoded, 'base64');
    const actualSize = bytes.length;
    if (actualSize !== file.size || actualSize > 300 * 1024) {
      throw new BadRequestError('Attachment size is invalid or exceeds 300 KB');
    }
    const validSignature = file.contentType === 'application/pdf'
      ? bytes.subarray(0, 5).toString('ascii') === '%PDF-'
      : file.contentType === 'image/png'
        ? bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
        : file.contentType === 'image/jpeg'
          ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          : file.contentType === 'image/webp'
            ? bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
              bytes.subarray(8, 12).toString('ascii') === 'WEBP'
            : file.contentType === 'application/msword'
              ? bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1'
              : bytes.subarray(0, 4).toString('hex') === '504b0304';
    if (!validSignature) {
      throw new BadRequestError('Attachment contents do not match the declared file type');
    }
    total += actualSize;
  }
  if (total > 300 * 1024) throw new BadRequestError('Combined attachments cannot exceed 300 KB');
}

const getClassStudents = async (classNumber: number) => StudentModel.find({
  isArchived: false,
  gradeLevel: new RegExp(`^Class\\s*${classNumber}$`, 'i'),
}).select('_id name gradeLevel').lean();

const getTaskKey = (input: HomeworkInput, subjectId?: mongoose.Types.ObjectId | null) =>
  createHash('sha256').update(JSON.stringify([
    input.classNumber ?? null,
    subjectId?.toString() ?? null,
    input.title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'),
    input.description.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'),
    input.assignedDate,
    input.dueDate,
    input.attachments.map(({ name, contentType, data }) => [name, contentType, data]),
  ])).digest('hex');

export class HomeworkService {
  static async create(input: HomeworkInput, assignedBy: string) {
    validateAttachments(input.attachments);
    let subjectId: mongoose.Types.ObjectId | null = null;
    if (input.assignmentType !== 'ALL_STUDENTS') {
      if (!input.classNumber || !input.subjectId) {
        throw new BadRequestError('Select a class and an active subject');
      }
      subjectId = objectId(input.subjectId, 'subject ID');
      const subject = await ClassSubjectModel.findOne({
        _id: subjectId,
        classNumber: input.classNumber,
        isActive: true,
      }).select('_id');
      if (!subject) throw new BadRequestError('Select an active subject available for this class');
    }

    const recipients = input.assignmentType === 'ALL_STUDENTS'
      ? await StudentModel.find({ isArchived: false }).select('_id name gradeLevel').lean()
      : input.assignmentType === 'CLASS'
        ? await getClassStudents(input.classNumber!)
        : await this.validateIndividualRecipients(
          input as HomeworkInput & { classNumber: number; subjectId: string }
        );
    if (!recipients.length) throw new BadRequestError('There are no eligible students to assign this homework');

    const targetStudentIds = recipients.map((student) => student._id);
    const taskKey = getTaskKey(input, subjectId);
    let homework = await HomeworkModel.findOne({ taskKey });
    let created = false;
    if (!homework) {
      try {
        homework = await HomeworkModel.create({
          ...input,
          subjectId,
          taskKey,
          assignedBy,
          targetStudentIds,
        });
        created = true;
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          error.code !== 11000
        ) throw error;
        homework = await HomeworkModel.findOne({ taskKey });
        if (!homework) throw error;
      }
    }
    if (!created) {
      await HomeworkModel.updateOne(
        { _id: homework._id },
        {
          $addToSet: { targetStudentIds: { $each: targetStudentIds } },
          ...(input.assignmentType !== 'INDIVIDUAL' ? { $set: { assignmentType: input.assignmentType } } : {}),
        }
      );
    }
    try {
      const recipientWrites = targetStudentIds.map((studentId) => ({
          updateOne: {
            filter: { homeworkId: homework._id, studentId },
            update: { $setOnInsert: { status: 'PENDING' as const, submissionFiles: [] } },
            upsert: true,
          },
        }));
      try {
        await StudentHomeworkModel.bulkWrite(recipientWrites, { ordered: false });
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          error.code !== 11000
        ) throw error;
        await StudentHomeworkModel.bulkWrite(recipientWrites, { ordered: false });
      }
    } catch (error) {
      if (created) {
        await StudentHomeworkModel.deleteMany({ homeworkId: homework._id });
        await HomeworkModel.deleteOne({ _id: homework._id });
      }
      throw error;
    }
    await this.refreshOverdue([homework._id]);
    return this.getAdminAssignment(homework._id.toString());
  }

  static async update(id: string, updates: {
    title?: string;
    description?: string;
    dueDate?: string;
    attachments?: IHomeworkAttachment[];
  }) {
    const homework = await HomeworkModel.findById(objectId(id, 'homework ID'));
    if (!homework) throw new NotFoundError('Homework not found');
    if (updates.dueDate && updates.dueDate < homework.assignedDate) {
      throw new BadRequestError('Due date must be on or after the assigned date');
    }
    if (updates.attachments) validateAttachments(updates.attachments);
    Object.assign(homework, updates);
    const updatedInput: HomeworkInput = {
      title: homework.title,
      description: homework.description,
      classNumber: homework.classNumber ?? undefined,
      subjectId: homework.subjectId?.toString(),
      assignedDate: homework.assignedDate,
      dueDate: homework.dueDate,
      assignmentType: homework.assignmentType,
      targetStudentIds: homework.targetStudentIds.map((id) => id.toString()),
      sourceAttendanceDate: homework.sourceAttendanceDate,
      attachments: homework.attachments,
    };
    homework.taskKey = getTaskKey(updatedInput, homework.subjectId);
    try {
      await homework.save();
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new BadRequestError('An identical homework task already exists. Edit that assignment instead.');
      }
      throw error;
    }
    await this.refreshOverdue([homework._id]);
    return this.getAdminAssignment(homework._id.toString());
  }

  static async delete(id: string) {
    const homeworkId = objectId(id, 'homework ID');
    const homework = await HomeworkModel.findByIdAndDelete(homeworkId);
    if (!homework) throw new NotFoundError('Homework not found');
    await StudentHomeworkModel.deleteMany({ homeworkId });
  }

  static async getAdminOverview(filters: {
    date?: string;
    classNumber?: number;
    subjectId?: string;
    studentId?: string;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.date) query.assignedDate = filters.date;
    if (filters.classNumber) {
      query.$or = [
        { classNumber: filters.classNumber },
        { assignmentType: 'ALL_STUDENTS' },
      ];
    }
    if (filters.subjectId) query.subjectId = objectId(filters.subjectId, 'subject ID');
    if (filters.studentId) query.targetStudentIds = objectId(filters.studentId, 'student ID');
    const homeworks = await HomeworkModel.find(query)
      .sort({ createdAt: -1 })
      .populate('subjectId', 'subjectName classNumber')
      .lean();
    const homeworkIds = homeworks.map((homework) => homework._id);
    await this.refreshOverdue(homeworkIds);
    const assignmentQuery: Record<string, unknown> = { homeworkId: { $in: homeworkIds } };
    let filteredClassStudentIds: mongoose.Types.ObjectId[] | undefined;
    if (filters.classNumber) {
      const classStudents = await getClassStudents(filters.classNumber);
      filteredClassStudentIds = classStudents.map((student) => student._id);
    }
    if (filters.studentId) {
      const studentId = objectId(filters.studentId, 'student ID');
      assignmentQuery.studentId = filteredClassStudentIds
        ? { $in: filteredClassStudentIds.filter((id) => id.equals(studentId)) }
        : studentId;
    } else if (filteredClassStudentIds) {
      assignmentQuery.studentId = { $in: filteredClassStudentIds };
    }
    const assignments = homeworkIds.length
      ? await StudentHomeworkModel.find(assignmentQuery)
        .select('-submissionFiles')
        .populate('studentId', 'name username gradeLevel')
        .sort({ updatedAt: -1 })
        .lean()
      : [];
    const assignmentByHomework = new Map<string, typeof assignments>();
    const homeworkById = new Map(homeworks.map((homework) => [homework._id.toString(), homework]));
    for (const assignment of assignments) {
      const key = assignment.homeworkId.toString();
      const group = assignmentByHomework.get(key) ?? [];
      group.push(assignment);
      assignmentByHomework.set(key, group);
    }
    const enriched = homeworks.map((homework) => {
      const recipients = assignmentByHomework.get(homework._id.toString()) ?? [];
      return {
        ...homework,
        studentAssignments: recipients,
        recipientCount: recipients.length,
        pendingCount: recipients.filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE').length,
        completedCount: recipients.filter((item) => item.status === 'COMPLETED' || item.status === 'SUBMITTED').length,
      };
    });
    const today = getIndiaDate();
    const todayQuery = { ...query, assignedDate: today };
    const todaysHomeworkIds = await HomeworkModel.find(todayQuery).distinct('_id');
    const todayAssignmentQuery: Record<string, unknown> = { homeworkId: { $in: todaysHomeworkIds } };
    if (filters.classNumber) {
      const classStudents = await getClassStudents(filters.classNumber);
      const classStudentIds = classStudents.map((student) => student._id);
      if (filters.studentId) {
        const studentId = objectId(filters.studentId, 'student ID');
        todayAssignmentQuery.studentId = {
          $in: classStudentIds.filter((id) => id.equals(studentId)),
        };
      } else {
        todayAssignmentQuery.studentId = { $in: classStudentIds };
      }
    } else if (filters.studentId) {
      todayAssignmentQuery.studentId = objectId(filters.studentId, 'student ID');
    }
    const totalAssignedToday = todaysHomeworkIds.length
      ? await StudentHomeworkModel.countDocuments(todayAssignmentQuery)
      : 0;
    const notSubmitted = assignments.filter((assignment) =>
      assignment.status === 'PENDING' || assignment.status === 'OVERDUE'
    );
    return {
      summary: {
        totalAssignedToday,
        pendingAssignments: assignments.filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE').length,
        completedAssignments: assignments.filter((item) => item.status === 'COMPLETED' || item.status === 'SUBMITTED').length,
        studentsNotSubmitted: notSubmitted.length,
      },
      notSubmitted: notSubmitted.map((assignment) => ({
        ...assignment,
        homework: homeworkById.get(assignment.homeworkId.toString()) ?? null,
      })),
      recentActivity: assignments.slice(0, 15).map((assignment) => ({
        ...assignment,
        homework: homeworkById.get(assignment.homeworkId.toString()) ?? null,
      })),
      assignments: enriched,
    };
  }

  static async getAdminAssignments(filters: {
    date?: string;
    classNumber?: number;
    subjectId?: string;
    studentId?: string;
    status?: string;
  }) {
    const result = await this.getAdminOverview(filters);
    if (!filters.status) return result.assignments;
    return result.assignments.map((homework) => ({
      ...homework,
      studentAssignments: homework.studentAssignments.filter((assignment) =>
        assignment.status === filters.status
      ),
    })).filter((homework) => homework.studentAssignments.length > 0);
  }

  static async getAdminSubmissions(homeworkId: string) {
    const id = objectId(homeworkId, 'homework ID');
    if (!await HomeworkModel.exists({ _id: id })) {
      throw new NotFoundError('Homework assignment not found');
    }
    return StudentHomeworkModel.find({ homeworkId: id })
      .select('studentId status submissionFiles submittedAt completedAt updatedAt')
      .populate('studentId', 'name username gradeLevel')
      .sort({ status: 1, updatedAt: -1 })
      .lean();
  }

  static async getOwnHomework(studentId: string) {
    const studentObjectId = objectId(studentId, 'student ID');
    const today = getIndiaDate();
    const records = await StudentHomeworkModel.find({ studentId: studentObjectId })
      .sort({ createdAt: -1 })
      .lean();
    const homeworks = records.length
      ? await HomeworkModel.find({ _id: { $in: records.map((record) => record.homeworkId) } })
        .select('-targetStudentIds -assignedBy -taskKey')
        .populate('subjectId', 'subjectName classNumber')
        .lean()
      : [];
    const homeworkById = new Map(homeworks.map((homework) => [homework._id.toString(), homework]));
    const overdueIds = records
      .filter((record) => {
        const homework = homeworkById.get(record.homeworkId.toString());
        return record.status === 'PENDING' && homework && homework.dueDate < today;
      })
      .map((record) => record._id);
    if (overdueIds.length) {
      await StudentHomeworkModel.updateMany(
        { _id: { $in: overdueIds }, status: 'PENDING' },
        { $set: { status: 'OVERDUE' } }
      );
    }
    return records.map((record) => {
      const homework = homeworkById.get(record.homeworkId.toString());
      return {
        ...record,
        homeworkId: homework ?? null,
        status: overdueIds.some((id) => id.equals(record._id)) ? 'OVERDUE' : record.status,
      };
    });
  }

  static async getOwnHomeworkDetail(studentId: string, id: string) {
    const record = await StudentHomeworkModel.findOne({
      _id: objectId(id, 'assignment ID'),
      studentId: objectId(studentId, 'student ID'),
    })
      .populate({
        path: 'homeworkId',
        select: 'title description classNumber subjectId assignedDate dueDate assignmentType attachments',
        populate: { path: 'subjectId', select: 'subjectName classNumber' },
      })
      .lean();
    if (!record) throw new NotFoundError('Homework assignment not found');
    return record;
  }

  static async completeOwnHomework(studentId: string, id: string) {
    const record = await StudentHomeworkModel.findOneAndUpdate(
      { _id: objectId(id, 'assignment ID'), studentId: objectId(studentId, 'student ID') },
      { $set: { status: 'COMPLETED', completedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!record) throw new NotFoundError('Homework assignment not found');
    return record;
  }

  static async submitOwnHomework(studentId: string, id: string, files: IHomeworkAttachment[]) {
    validateAttachments(files);
    const record = await StudentHomeworkModel.findOne({
      _id: objectId(id, 'assignment ID'),
      studentId: objectId(studentId, 'student ID'),
    });
    if (!record) throw new NotFoundError('Homework assignment not found');
    if (record.status === 'COMPLETED') {
      throw new BadRequestError('Completed homework cannot accept further submissions');
    }
    record.submissionFiles = files;
    record.status = 'SUBMITTED';
    record.submittedAt = new Date();
    await record.save();
    return record;
  }

  static async getAbsentNotifications(includeResolved = false) {
    const query = includeResolved ? {} : { isResolved: false };
    return AdminNotificationModel.find(query)
      .populate('studentId', 'name username gradeLevel')
      .sort({ isResolved: 1, isRead: 1, createdAt: -1 })
      .limit(100)
      .lean();
  }

  static async updateNotification(id: string, updates: { isRead?: boolean; isResolved?: boolean }) {
    const notification = await AdminNotificationModel.findByIdAndUpdate(
      objectId(id, 'notification ID'),
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  }

  private static async validateIndividualRecipients(
    input: HomeworkInput & { classNumber: number; subjectId: string }
  ) {
    if (!input.targetStudentIds.length) {
      throw new BadRequestError('Select at least one student for individual homework');
    }
    const ids = input.targetStudentIds.map((id) => objectId(id, 'student ID'));
    if (new Set(ids.map(String)).size !== ids.length) {
      throw new BadRequestError('Duplicate student IDs are not allowed');
    }
    const students = await StudentModel.find({
      _id: { $in: ids },
      isArchived: false,
      gradeLevel: new RegExp(`^Class\\s*${input.classNumber}$`, 'i'),
    }).select('_id name gradeLevel').lean();
    if (students.length !== ids.length) {
      throw new BadRequestError('Every selected student must be active and belong to the selected class');
    }
    if (input.sourceAttendanceDate) {
      const absent = await AttendanceModel.find({
        studentId: { $in: ids },
        date: input.sourceAttendanceDate,
        status: 'absent',
      }).distinct('studentId');
      if (absent.length !== ids.length) {
        throw new BadRequestError('Absent-student homework can only be assigned to students marked absent on that date');
      }
    }
    return students;
  }

  private static async getAdminAssignment(id: string) {
    const homeworkId = objectId(id, 'homework ID');
    const homework = await HomeworkModel.findById(homeworkId)
      .populate('subjectId', 'subjectName classNumber')
      .lean();
    if (!homework) throw new NotFoundError('Homework assignment not found');
    await this.refreshOverdue([homeworkId]);
    const recipients = await StudentHomeworkModel.find({ homeworkId })
      .populate('studentId', 'name username gradeLevel')
      .sort({ updatedAt: -1 })
      .lean();
    return {
      ...homework,
      studentAssignments: recipients,
      recipientCount: recipients.length,
      pendingCount: recipients.filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE').length,
      completedCount: recipients.filter((item) => item.status === 'COMPLETED' || item.status === 'SUBMITTED').length,
    };
  }

  private static async refreshOverdue(homeworkIds: mongoose.Types.ObjectId[]) {
    if (!homeworkIds.length) return;
    const today = getIndiaDate();
    const homeworkDueDates = await HomeworkModel.find({ _id: { $in: homeworkIds } })
      .select('_id dueDate')
      .lean();
    const expired = homeworkDueDates
      .filter((homework) => homework.dueDate < today)
      .map((homework) => homework._id);
    const upcoming = homeworkDueDates
      .filter((homework) => homework.dueDate >= today)
      .map((homework) => homework._id);
    if (expired.length) {
      await StudentHomeworkModel.updateMany(
        { homeworkId: { $in: expired }, status: 'PENDING' },
        { $set: { status: 'OVERDUE' } }
      );
    }
    if (upcoming.length) {
      await StudentHomeworkModel.updateMany(
        { homeworkId: { $in: upcoming }, status: 'OVERDUE' },
        { $set: { status: 'PENDING' } }
      );
    }
  }
}
