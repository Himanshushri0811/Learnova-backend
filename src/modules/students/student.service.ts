import { StudentModel, IStudent } from './student.model.js';
import { NotFoundError } from '../../utils/errors.js';

export interface CreateStudentInput {
  name: string;
  gradeLevel: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  academicNotes?: string;
}

export interface UpdateStudentInput {
  name?: string;
  gradeLevel?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  academicNotes?: string;
}

export interface StudentFilterOptions {
  includeArchived?: boolean;
  gradeLevel?: string;
  search?: string;
}

export class StudentService {
  /**
   * Create a new student enrollment record
   */
  static async createStudent(input: CreateStudentInput): Promise<IStudent> {
    const student = new StudentModel({
      ...input,
      isArchived: false,
      archivedAt: null,
    });
    return await student.save();
  }

  /**
   * Retrieve students with filtering; preserves archival records separately
   */
  static async getStudents(filters: StudentFilterOptions = {}): Promise<IStudent[]> {
    const query: Record<string, any> = {};

    if (!filters.includeArchived) {
      query.isArchived = false;
    }

    if (filters.gradeLevel) {
      query.gradeLevel = filters.gradeLevel;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { guardianName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return await StudentModel.find(query).sort({ createdAt: -1 });
  }

  /**
   * Find single student by ID
   */
  static async getStudentById(id: string): Promise<IStudent> {
    const student = await StudentModel.findById(id);
    if (!student) {
      throw new NotFoundError(`Student record with ID '${id}' not found`);
    }
    return student;
  }

  /**
   * Update student details (prevents unauthorized role or mass assignment)
   */
  static async updateStudent(id: string, input: UpdateStudentInput): Promise<IStudent> {
    const student = await StudentModel.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true }
    );

    if (!student) {
      throw new NotFoundError(`Student record with ID '${id}' not found`);
    }

    return student;
  }

  /**
   * Soft-delete / Archive student to preserve academic history
   */
  static async archiveStudent(id: string): Promise<IStudent> {
    const student = await StudentModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!student) {
      throw new NotFoundError(`Student record with ID '${id}' not found`);
    }

    return student;
  }

  /**
   * Restore archived student
   */
  static async restoreStudent(id: string): Promise<IStudent> {
    const student = await StudentModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isArchived: false,
          archivedAt: null,
        },
      },
      { new: true }
    );

    if (!student) {
      throw new NotFoundError(`Student record with ID '${id}' not found`);
    }

    return student;
  }
}

