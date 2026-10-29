import { Router } from 'express';
import { StudentController } from './student.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole, requireStudentAccess } from '../../middleware/auth.js';
import { createStudentSchema, updateStudentSchema, getStudentsQuerySchema, studentIdParamSchema, } from './student.schema.js';
const router = Router();
// In foundation phase, all student routes require valid authentication
router.use(authenticate);
// List active/archived students (Admin only)
router.get('/', requireRole(['admin']), validate(getStudentsQuerySchema), StudentController.list);
// Create student record (Admin only)
router.post('/', requireRole(['admin']), validate(createStudentSchema), StudentController.create);
// Get single student record (Admin, Student itself, or linked Guardian)
router.get('/:id', validate(studentIdParamSchema), requireStudentAccess, StudentController.getById);
// Update student record (Admin only)
router.patch('/:id', requireRole(['admin']), validate(updateStudentSchema), StudentController.update);
// Soft-delete / Archive student record (Admin only)
router.delete('/:id', requireRole(['admin']), validate(studentIdParamSchema), StudentController.archive);
// Restore archived student record (Admin only)
router.post('/:id/restore', requireRole(['admin']), validate(studentIdParamSchema), StudentController.restore);
export const studentRouter = router;
