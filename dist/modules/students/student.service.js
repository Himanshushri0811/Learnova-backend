import bcrypt from 'bcryptjs';
import { StudentModel } from './student.model.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
export class StudentService {
    /**
     * Create a new student enrollment record
     */
    static async createStudent(input) {
        const studentData = {
            name: input.name,
            gradeLevel: input.gradeLevel,
            guardianName: input.guardianName,
            guardianPhone: input.guardianPhone,
            guardianEmail: input.guardianEmail || undefined,
            academicNotes: input.academicNotes || undefined,
            isArchived: false,
            archivedAt: null,
        };
        if (input.username && input.username.trim()) {
            const normalizedUsername = input.username.trim().toLowerCase();
            const existing = await StudentModel.findOne({ username: normalizedUsername });
            if (existing) {
                throw new BadRequestError(`Username '${normalizedUsername}' is already taken`);
            }
            studentData.username = normalizedUsername;
        }
        if (input.password && input.password.trim()) {
            studentData.passwordHash = await bcrypt.hash(input.password, 10);
        }
        const student = new StudentModel(studentData);
        return await student.save();
    }
    /**
     * Retrieve students with filtering; preserves archival records separately
     */
    static async getStudents(filters = {}) {
        const query = {};
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
    static async getStudentById(id) {
        const student = await StudentModel.findById(id);
        if (!student) {
            throw new NotFoundError(`Student record with ID '${id}' not found`);
        }
        return student;
    }
    /**
     * Update student details (prevents unauthorized role or mass assignment)
     */
    static async updateStudent(id, input) {
        const updatePayload = {};
        if (input.name !== undefined)
            updatePayload.name = input.name;
        if (input.gradeLevel !== undefined)
            updatePayload.gradeLevel = input.gradeLevel;
        if (input.guardianName !== undefined)
            updatePayload.guardianName = input.guardianName;
        if (input.guardianPhone !== undefined)
            updatePayload.guardianPhone = input.guardianPhone;
        if (input.guardianEmail !== undefined)
            updatePayload.guardianEmail = input.guardianEmail || undefined;
        if (input.academicNotes !== undefined)
            updatePayload.academicNotes = input.academicNotes || undefined;
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
        const student = await StudentModel.findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true });
        if (!student) {
            throw new NotFoundError(`Student record with ID '${id}' not found`);
        }
        return student;
    }
    /**
     * Soft-delete / Archive student to preserve academic history
     */
    static async archiveStudent(id) {
        const student = await StudentModel.findByIdAndUpdate(id, {
            $set: {
                isArchived: true,
                archivedAt: new Date(),
            },
        }, { new: true });
        if (!student) {
            throw new NotFoundError(`Student record with ID '${id}' not found`);
        }
        return student;
    }
    /**
     * Restore archived student
     */
    static async restoreStudent(id) {
        const student = await StudentModel.findByIdAndUpdate(id, {
            $set: {
                isArchived: false,
                archivedAt: null,
            },
        }, { new: true });
        if (!student) {
            throw new NotFoundError(`Student record with ID '${id}' not found`);
        }
        return student;
    }
}
