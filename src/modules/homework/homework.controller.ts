import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../utils/errors.js';
import { HomeworkService } from './homework.service.js';

const requireUserId = (req: Request, role: 'admin' | 'student') => {
  if (!req.user || req.user.role !== role) {
    throw new ForbiddenError(`Only authenticated ${role}s can access this endpoint`);
  }
  return req.user.id;
};

export class HomeworkController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const homework = await HomeworkService.create(req.body, requireUserId(req, 'admin'));
      res.status(201).json({ status: 'success', data: { homework } });
    } catch (error) { next(error); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const homework = await HomeworkService.update(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: { homework } });
    } catch (error) { next(error); }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await HomeworkService.delete(req.params.id);
      res.status(200).json({ status: 'success', message: 'Homework deleted successfully' });
    } catch (error) { next(error); }
  }

  static async overview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await HomeworkService.getAdminOverview({
        date: req.query.date as string | undefined,
        classNumber: req.query.classNumber ? Number(req.query.classNumber) : undefined,
        subjectId: req.query.subjectId as string | undefined,
        studentId: req.query.studentId as string | undefined,
      });
      res.status(200).json({ status: 'success', data });
    } catch (error) { next(error); }
  }

  static async assignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await HomeworkService.getAdminAssignments({
        date: req.query.date as string | undefined,
        classNumber: req.query.classNumber ? Number(req.query.classNumber) : undefined,
        subjectId: req.query.subjectId as string | undefined,
        studentId: req.query.studentId as string | undefined,
        status: req.query.status as string | undefined,
      });
      res.status(200).json({ status: 'success', results: assignments.length, data: { assignments } });
    } catch (error) { next(error); }
  }

  static async submissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const submissions = await HomeworkService.getAdminSubmissions(req.params.id);
      res.status(200).json({ status: 'success', results: submissions.length, data: { submissions } });
    } catch (error) { next(error); }
  }

  static async notifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await HomeworkService.getAbsentNotifications(
        req.query.includeResolved === 'true'
      );
      res.status(200).json({ status: 'success', results: notifications.length, data: { notifications } });
    } catch (error) { next(error); }
  }

  static async updateNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await HomeworkService.updateNotification(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: { notification } });
    } catch (error) { next(error); }
  }

  static async mine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await HomeworkService.getOwnHomework(requireUserId(req, 'student'));
      res.status(200).json({ status: 'success', results: assignments.length, data: { assignments } });
    } catch (error) { next(error); }
  }

  static async myDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const homework = await HomeworkService.getOwnHomeworkDetail(
        requireUserId(req, 'student'),
        req.params.id
      );
      res.status(200).json({ status: 'success', data: { homework } });
    } catch (error) { next(error); }
  }

  static async completeMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignment = await HomeworkService.completeOwnHomework(
        requireUserId(req, 'student'),
        req.params.id
      );
      res.status(200).json({ status: 'success', data: { assignment } });
    } catch (error) { next(error); }
  }

  static async submitMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignment = await HomeworkService.submitOwnHomework(
        requireUserId(req, 'student'),
        req.params.id,
        req.body.files
      );
      res.status(200).json({ status: 'success', data: { assignment } });
    } catch (error) { next(error); }
  }
}
