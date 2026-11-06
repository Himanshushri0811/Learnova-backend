import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AttendanceController } from './attendance.controller.js';
import {
    createHolidaySchema,
    getAttendanceSchema,
    getHolidaysSchema,
    getMyAttendanceSchema,
    holidayIdSchema,
    saveAttendanceSchema,
    updateAttendanceSchema,
    updateHolidaySchema,
} from './attendance.schema.js';

const router = Router();

router.use(authenticate);

// Authenticated student access to own attendance records
router.get(
    '/my-attendance',
    requireRole(['student']),
    validate(getMyAttendanceSchema),
    AttendanceController.getMyAttendance
);
router.get(
    '/my-attendance/summary',
    requireRole(['student']),
    AttendanceController.getMyAttendance
);
router.get(
    '/my-holidays',
    requireRole(['student']),
    validate(getMyAttendanceSchema),
    AttendanceController.getMyHolidays
);

// Admin-only attendance management
router.use(requireRole(['admin']));

router.get('/', validate(getAttendanceSchema), AttendanceController.getByDate);
router.get('/holidays', validate(getHolidaysSchema), AttendanceController.getHolidays);
router.post('/holidays', validate(createHolidaySchema), AttendanceController.createHoliday);
router.put('/holidays/:id', validate(updateHolidaySchema), AttendanceController.updateHoliday);
router.delete('/holidays/:id', validate(holidayIdSchema), AttendanceController.deleteHoliday);
router.post('/bulk', validate(saveAttendanceSchema), AttendanceController.save);
router.put('/', validate(saveAttendanceSchema), AttendanceController.save);
router.put('/:studentId', validate(updateAttendanceSchema), AttendanceController.updateStudent);

export const attendanceRouter = router;