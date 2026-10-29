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
}