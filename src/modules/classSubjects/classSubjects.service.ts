import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { StudentModel } from '../students/student.model.js';
import { ClassSubjectModel } from './classSubject.model.js';
import { StudentSubjectSelectionModel } from './studentSubjectSelection.model.js';
import { SubjectRequestModel, SubjectRequestStatus } from './subjectRequest.model.js';

const normalizeSubjectName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

const getClassNumber = (gradeLevel?: string): number | null => {
  const match = gradeLevel?.trim().match(/^Class\s*(10|[1-9])$/i);
  return match ? Number(match[1]) : null;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertObjectId = (id: string, label: string): mongoose.Types.ObjectId => {
  if (!mongoose.isValidObjectId(id)) throw new BadRequestError(`Invalid ${label}`);
  return new mongoose.Types.ObjectId(id);
};

const throwDuplicateSubject = (error: unknown): never => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    throw new BadRequestError('This subject already exists in the selected class');
  }
  throw error;
};

export class ClassSubjectsService {
  static async getAdminOverview(classNumber?: number) {
    const [activeSubjects, selections] = await Promise.all([
      ClassSubjectModel.countDocuments({ isActive: true }),
      StudentSubjectSelectionModel.countDocuments({ subjectIds: { $exists: true, $ne: [] } }),
    ]);
    const filter = classNumber ? { classNumber } : {};
    const classes = await ClassSubjectModel.aggregate([
      { $match: filter },
      { $group: { _id: '$classNumber', totalSubjects: { $sum: 1 }, activeSubjects: { $sum: { $cond: ['$isActive', 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]);
    return {
      totalClasses: 10,
      activeSubjects,
      studentsWithSelectedSubjects: selections,
      classes,
    };
  }

  static async getSubjectsForClass(classNumber?: number) {
    const filter = classNumber ? { classNumber } : {};
    const [subjects, selections] = await Promise.all([
      ClassSubjectModel.find(filter).sort({ classNumber: 1, subjectName: 1 }).lean(),
      StudentSubjectSelectionModel.find({ ...filter, subjectIds: { $exists: true, $ne: [] } })
        .select('subjectIds')
        .lean(),
    ]);
    const counts = new Map<string, number>();
    for (const selection of selections) {
      for (const id of selection.subjectIds) {
        const key = id.toString();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return subjects.map((subject) => ({
      ...subject,
      studentCount: counts.get(subject._id.toString()) ?? 0,
    }));
  }

  static async createSubject(classNumber: number, subjectName: string) {
    const name = subjectName.trim().replace(/\s+/g, ' ');
    try {
      return await ClassSubjectModel.create({
        classNumber,
        subjectName: name,
        normalizedSubjectName: normalizeSubjectName(name),
        isActive: true,
      });
    } catch (error) {
      return throwDuplicateSubject(error);
    }
  }

  static async updateSubject(id: string, subjectName: string) {
    const subjectId = assertObjectId(id, 'subject ID');
    const name = subjectName.trim().replace(/\s+/g, ' ');
    const subject = await ClassSubjectModel.findById(subjectId);
    if (!subject) throw new NotFoundError('Subject not found');
    subject.subjectName = name;
    subject.normalizedSubjectName = normalizeSubjectName(name);
    try {
      await subject.save();
      return subject;
    } catch (error) {
      return throwDuplicateSubject(error);
    }
  }

  static async setSubjectStatus(id: string, isActive: boolean) {
    const subject = await ClassSubjectModel.findByIdAndUpdate(
      assertObjectId(id, 'subject ID'),
      { $set: { isActive } },
      { new: true, runValidators: true }
    );
    if (!subject) throw new NotFoundError('Subject not found');
    return subject;
  }

  static async deleteSubject(id: string) {
    const subjectId = assertObjectId(id, 'subject ID');
    const subject = await ClassSubjectModel.findById(subjectId);
    if (!subject) throw new NotFoundError('Subject not found');
    const selected = await StudentSubjectSelectionModel.exists({ subjectIds: subjectId });
    if (selected) {
      throw new BadRequestError('This subject is selected by students. Deactivate it instead.');
    }
    await subject.deleteOne();
  }

  static async getStudents(filters: {
    classNumber?: number;
    subjectId?: string;
    search?: string;
  }) {
    const selectionQuery: Record<string, unknown> = {};
    if (filters.classNumber) selectionQuery.classNumber = filters.classNumber;
    if (filters.subjectId) {
      selectionQuery.subjectIds = assertObjectId(filters.subjectId, 'subject ID');
    }
    const selections = await StudentSubjectSelectionModel.find(selectionQuery)
      .select('studentId classNumber subjectIds')
      .lean();
    const studentIds = selections.map((selection) => selection.studentId);
    const studentQuery: Record<string, unknown> = {
      _id: { $in: studentIds },
      isArchived: false,
    };
    if (filters.search?.trim()) {
      const search = new RegExp(escapeRegex(filters.search.trim()), 'i');
      studentQuery.$or = [{ name: search }, { username: search }, { gradeLevel: search }];
    }
    const students = await StudentModel.find(studentQuery)
      .select('_id name username gradeLevel')
      .sort({ name: 1 })
      .lean();
    const selectionByStudent = new Map(
      selections.map((selection) => [selection.studentId.toString(), selection])
    );
    const subjectIds = [...new Set(selections.flatMap((selection) => selection.subjectIds.map((id) => id.toString())))];
    const subjects = await ClassSubjectModel.find({ _id: { $in: subjectIds } })
      .select('_id classNumber subjectName isActive')
      .lean();
    const subjectById = new Map(subjects.map((subject) => [subject._id.toString(), subject]));
    return students.map((student) => {
      const selection = selectionByStudent.get(student._id.toString());
      return {
        student,
        classNumber: selection?.classNumber,
        selectedSubjects: (selection?.subjectIds ?? [])
          .map((id) => subjectById.get(id.toString()))
          .filter((subject) => subject !== undefined),
      };
    });
  }

  static async getStudentSubjects(studentId: string) {
    const student = await StudentModel.findOne({
      _id: assertObjectId(studentId, 'student ID'),
      isArchived: false,
    }).select('_id gradeLevel');
    if (!student) throw new NotFoundError('Student not found');
    const classNumber = getClassNumber(student.gradeLevel);
    if (!classNumber) {
      return { classNumber: null, availableSubjects: [], selectedSubjectIds: [] };
    }

    const [availableSubjects, selection] = await Promise.all([
      ClassSubjectModel.find({ classNumber, isActive: true }).sort({ subjectName: 1 }).lean(),
      StudentSubjectSelectionModel.findOne({ studentId: student._id, classNumber }).lean(),
    ]);
    const selectedIds = (selection?.subjectIds ?? []).map((id) => id.toString());
    const inactiveSelectedIds = selectedIds.filter(
      (id) => !availableSubjects.some((subject) => subject._id.toString() === id)
    );
    const inactiveSelected = inactiveSelectedIds.length
      ? await ClassSubjectModel.find({ _id: { $in: inactiveSelectedIds }, classNumber }).lean()
      : [];
    return {
      classNumber,
      availableSubjects: [
        ...availableSubjects,
        ...inactiveSelected.map((subject) => ({ ...subject, isActive: false })),
      ],
      selectedSubjectIds: selectedIds,
    };
  }

  static async updateStudentSubjects(studentId: string, subjectIds: string[]) {
    const student = await StudentModel.findOne({
      _id: assertObjectId(studentId, 'student ID'),
      isArchived: false,
    }).select('_id gradeLevel');
    if (!student) throw new NotFoundError('Student not found');
    const classNumber = getClassNumber(student.gradeLevel);
    if (!classNumber) throw new BadRequestError('Set your class in your profile before selecting subjects');
    if (new Set(subjectIds).size !== subjectIds.length) {
      throw new BadRequestError('Duplicate subject IDs are not allowed');
    }
    const requestedIds = subjectIds.map((id) => assertObjectId(id, 'subject ID'));
    const currentSelection = await StudentSubjectSelectionModel.findOne({
      studentId: student._id,
      classNumber,
    }).lean();
    const previouslySelected = new Set(
      (currentSelection?.subjectIds ?? []).map((id) => id.toString())
    );
    const subjects = requestedIds.length
      ? await ClassSubjectModel.find({
          _id: { $in: requestedIds },
          classNumber,
          $or: [{ isActive: true }, { _id: { $in: requestedIds.filter((id) => previouslySelected.has(id.toString())) } }],
        }).select('_id')
      : [];
    if (subjects.length !== requestedIds.length) {
      throw new BadRequestError('Select only active subjects available for your current class');
    }
    const selection = await StudentSubjectSelectionModel.findOneAndUpdate(
      { studentId: student._id },
      { $set: { classNumber, subjectIds: requestedIds } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return this.getStudentSubjects(student._id.toString()).then((data) => ({
      ...data,
      updatedAt: selection.updatedAt,
    }));
  }

  static async createSubjectRequest(studentId: string, requestedSubjectName: string) {
    const student = await StudentModel.findOne({
      _id: assertObjectId(studentId, 'student ID'),
      isArchived: false,
    }).select('_id gradeLevel');
    if (!student) throw new NotFoundError('Student not found');
    const classNumber = getClassNumber(student.gradeLevel);
    if (!classNumber) throw new BadRequestError('Set your class in your profile before requesting a subject');
    const name = requestedSubjectName.trim().replace(/\s+/g, ' ');
    const normalizedSubjectName = normalizeSubjectName(name);
    if (await ClassSubjectModel.exists({ classNumber, normalizedSubjectName })) {
      throw new BadRequestError('This subject is already listed for your class');
    }
    try {
      return await SubjectRequestModel.create({
        studentId: student._id,
        classNumber,
        requestedSubjectName: name,
        normalizedSubjectName,
        status: 'PENDING',
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new BadRequestError('You already have a pending request for this subject');
      }
      throw error;
    }
  }

  static async getPendingRequests() {
    return SubjectRequestModel.find({ status: 'PENDING' })
      .populate('studentId', 'name username gradeLevel')
      .sort({ createdAt: 1 })
      .lean();
  }

  static async reviewRequest(
    id: string,
    status: Exclude<SubjectRequestStatus, 'PENDING'>,
    reviewedBy: string
  ) {
    const request = await SubjectRequestModel.findOne({ _id: id, status: 'PENDING' });
    if (!request) throw new NotFoundError('Pending subject request not found');
    if (status === 'APPROVED') {
      const existing = await ClassSubjectModel.exists({
        classNumber: request.classNumber,
        normalizedSubjectName: request.normalizedSubjectName,
      });
      if (!existing) {
        try {
          await ClassSubjectModel.create({
            classNumber: request.classNumber,
            subjectName: request.requestedSubjectName,
            normalizedSubjectName: request.normalizedSubjectName,
            isActive: true,
          });
        } catch (error) {
          return throwDuplicateSubject(error);
        }
      }
    }
    request.status = status;
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date();
    await request.save();
    return request;
  }
}
