import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service.js';

export class AttendanceController {
    static async getByDate(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const date = req.query.date as string;
            const records = await AttendanceService.getByDate(date);

            res.status(200).json({
                status: 'success',
                results: records.length,
                data: { records },
            });
        } catch (error) {
            next(error);
        }
    }

    static async save(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const markedBy = req.user?.id;

            if (!markedBy) {
                res.status(401).json({
                    status: 'error',
                    message: 'Authentication required',
                });
                return;
            }

            const { date, entries } = req.body;
            const records = await AttendanceService.saveForDate(
                date,
                entries,
                markedBy
            );

            res.status(200).json({
                status: 'success',
                results: records.length,
                data: { records },
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateStudent(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const markedBy = req.user?.id;
            if (!markedBy) {
                res.status(401).json({ status: 'error', message: 'Authentication required' });
                return;
            }
            const { date, status, remarks } = req.body;
            const records = await AttendanceService.updateStudentAttendance(
                req.params.studentId,
                date,
                status,
                markedBy,
                remarks
            );
            res.status(200).json({ status: 'success', data: { records } });
        } catch (error) {
            next(error);
        }
    }

    static async getMyAttendance(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user || req.user.role !== 'student') {
                res.status(403).json({
                    status: 'fail',
                    message: 'Only authenticated students can view attendance via this endpoint',
                });
                return;
            }

            const month = req.query.month as string | undefined;
            const data = await AttendanceService.getAttendanceForStudent(req.user.id, month);
            res.status(200).json({
                status: 'success',
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    static async getHolidays(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const holidays = await AttendanceService.getHolidays(
                req.query.startDate as string | undefined,
                req.query.endDate as string | undefined
            );
            res.status(200).json({ status: 'success', results: holidays.length, data: { holidays } });
        } catch (error) {
            next(error);
        }
    }

    static async getMyHolidays(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const holidays = await AttendanceService.getStudentHolidays(
                req.query.month as string | undefined
            );
            res.status(200).json({ status: 'success', results: holidays.length, data: { holidays } });
        } catch (error) {
            next(error);
        }
    }

    static async createHoliday(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const createdBy = req.user?.id;
            if (!createdBy) {
                res.status(401).json({ status: 'error', message: 'Authentication required' });
                return;
            }
            const holiday = await AttendanceService.createHoliday(req.body, createdBy);
            res.status(201).json({ status: 'success', data: { holiday } });
        } catch (error) {
            next(error);
        }
    }

    static async updateHoliday(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const holiday = await AttendanceService.updateHoliday(req.params.id, req.body);
            res.status(200).json({ status: 'success', data: { holiday } });
        } catch (error) {
            next(error);
        }
    }

    static async deleteHoliday(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            await AttendanceService.deleteHoliday(req.params.id);
            res.status(200).json({ status: 'success', message: 'Holiday deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}