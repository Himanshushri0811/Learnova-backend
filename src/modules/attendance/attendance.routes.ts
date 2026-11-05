import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AttendanceController } from './attendance.controller.js';
import {
    getAttendanceSchema,
    saveAttendanceSchema,
} from './attendance.schema.js';

const router = Router();

router.use(authenticate);

// Authenticated student access to own attendance records
router.get(
    '/my-attendance',
    requireRole(['student']),
    AttendanceController.getMyAttendance
);

// Admin-only attendance management
router.use(requireRole(['admin']));

router.get('/', validate(getAttendanceSchema), AttendanceController.getByDate);

router.put('/', validate(saveAttendanceSchema), AttendanceController.save);

export const attendanceRouter = router;