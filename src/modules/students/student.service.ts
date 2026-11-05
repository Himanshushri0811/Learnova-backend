import { randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { StudentModel, IStudent } from './student.model.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export interface CreateStudentInput {
  name: string;
  gradeLevel?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  academicNotes?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  profilePhoto?: string;
  username?: string;
  password?: string;
}

export interface UpdateStudentInput {
  name?: string;
  gradeLevel?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  academicNotes?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  profilePhoto?: string;
  username?: string;
  password?: string;
}

export interface StudentFilterOptions {
  includeArchived?: boolean;
  gradeLevel?: string;
  search?: string;
}

export interface CreateStudentResult {
  student: IStudent;
  credentials: {
    username: string;
    initialPassword: string;
  };
}

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 11000;

export class StudentService {
  /**
   * Helper to generate a unique student username
   */
  private static async generateUniqueUsername(name: string): Promise<string> {
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    const base = cleanName.length >= 3 ? cleanName : 'student';

    for (let attempts = 0; attempts < 50; attempts++) {
      const suffix = randomInt(100000, 1000000);
      const candidate = `${base}${suffix}`;
      const existing = await StudentModel.findOne({ username: candidate });
      if (!existing) {
        return candidate;
      }
    }

    throw new BadRequestError('Unable to generate a unique username. Please try again.');
  }

  /**
   * Helper to generate a secure readable initial password
   */
  private static generateInitialPassword(): string {
    return `Ln@${randomBytes(18).toString('base64url')}`;
  }

  /**
   * Create a new student enrollment record and assign login credentials
   */
  static async createStudent(input: CreateStudentInput): Promise<CreateStudentResult> {
    const studentData: Record<string, any> = {
      name: input.name.trim(),
      isArchived: false,
      archivedAt: null,
    };
    if (input.gradeLevel?.trim()) studentData.gradeLevel = input.gradeLevel.trim();
    if (input.guardianName?.trim()) studentData.guardianName = input.guardianName.trim();
    if (input.guardianPhone?.trim()) studentData.guardianPhone = input.guardianPhone.trim();
    if (input.guardianEmail?.trim()) studentData.guardianEmail = input.guardianEmail.trim();
    if (input.academicNotes?.trim()) studentData.academicNotes = input.academicNotes.trim();
    if (input.fatherName?.trim()) studentData.fatherName = input.fatherName.trim();
    if (input.motherName?.trim()) studentData.motherName = input.motherName.trim();
    if (input.address?.trim()) studentData.address = input.address.trim();
    if (input.profilePhoto) studentData.profilePhoto = input.profilePhoto;

    let assignedUsername: string | undefined;
    if (input.username && input.username.trim()) {
      const normalizedUsername = input.username.trim().toLowerCase();
      const existing = await StudentModel.findOne({ username: normalizedUsername });
      if (existing) {
        throw new BadRequestError(`Username '${normalizedUsername}' is already taken`);
      }
      assignedUsername = normalizedUsername;
    }

    const initialPassword =
      input.password && input.password.trim()
        ? input.password.trim()
        : this.generateInitialPassword();

    studentData.passwordHash = await bcrypt.hash(initialPassword, 10);

    for (let attempt = 0; attempt < (assignedUsername ? 1 : 5); attempt++) {
      const username = assignedUsername ?? await this.generateUniqueUsername(input.name);

      try {
        const student = new StudentModel({ ...studentData, username });
        await student.save();

        return {
          student,
          credentials: {
            username,
            initialPassword,
          },
        };
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;

        if (assignedUsername || attempt === 4) {
          throw new BadRequestError(`Username '${username}' is already taken`);
        }
      }
    }

    throw new BadRequestError('Unable to assign a unique username. Please try again.');
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
    const updatePayload: Record<string, any> = {};
    const unsetPayload: Record<string, 1> = {};
    const setOptionalField = (field: string, value: string | undefined) => {
      if (value === undefined) return;
      if (value.trim() === '') {
        unsetPayload[field] = 1;
      } else {
        updatePayload[field] = value;
      }
    };

    if (input.name !== undefined) updatePayload.name = input.name;
    setOptionalField('gradeLevel', input.gradeLevel);
    setOptionalField('guardianName', input.guardianName);
    setOptionalField('guardianPhone', input.guardianPhone);
    setOptionalField('guardianEmail', input.guardianEmail);
    setOptionalField('academicNotes', input.academicNotes);
    setOptionalField('fatherName', input.fatherName);
    setOptionalField('motherName', input.motherName);
    setOptionalField('address', input.address);
    setOptionalField('profilePhoto', input.profilePhoto);

    if (input.username !== undefined) {
      const normalizedUsername = input.username ? input.username.trim().toLowerCase() : undefined;
      if (normalizedUsername) {
        const existing = await StudentModel.findOne({
          username: normalizedUsername,
          _id: { $ne: id },
        });
        if (existing) {
          throw new BadRequestError(`Username '${normalizedUsername}' is already taken`);
        }
        updatePayload.username = normalizedUsername;
      }
    }

    if (input.password && input.password.trim()) {
      updatePayload.passwordHash = await bcrypt.hash(input.password, 10);
    }

    const update: Record<string, Record<string, unknown>> = {};
    if (Object.keys(updatePayload).length) update.$set = updatePayload;
    if (Object.keys(unsetPayload).length) update.$unset = unsetPayload;

    const student = await StudentModel.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!student) {
      throw new NotFoundError(`Student record with ID '${id}' not found`);
    }

    return student;
  }

  static async changeStudentPassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const student = await StudentModel.findById(id).select('+passwordHash');
    if (!student) {
      throw new NotFoundError(`Student record with ID '${id}' not found`);
    }

    if (!student.passwordHash || !(await bcrypt.compare(currentPassword, student.passwordHash))) {
      throw new BadRequestError('Current password is incorrect');
    }

    student.passwordHash = await bcrypt.hash(newPassword, 10);
    await student.save();
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
