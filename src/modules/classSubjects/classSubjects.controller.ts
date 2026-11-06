import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../utils/errors.js';
import { ClassSubjectsService } from './classSubjects.service.js';

export class ClassSubjectsController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classNumber = req.query.classNumber ? Number(req.query.classNumber) : undefined;
      const overview = await ClassSubjectsService.getAdminOverview(classNumber);
      res.status(200).json({ status: 'success', data: overview });
    } catch (error) {
      next(error);
    }
  }

  static async getClassSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classNumber = req.query.classNumber ? Number(req.query.classNumber) : undefined;
      const subjects = await ClassSubjectsService.getSubjectsForClass(classNumber);
      res.status(200).json({ status: 'success', results: subjects.length, data: { subjects } });
    } catch (error) {
      next(error);
    }
  }

  static async createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await ClassSubjectsService.createSubject(
        req.body.classNumber,
        req.body.subjectName
      );
      res.status(201).json({ status: 'success', data: { subject } });
    } catch (error) {
      next(error);
    }
  }

  static async updateSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await ClassSubjectsService.updateSubject(
        req.params.id,
        req.body.subjectName
      );
      res.status(200).json({ status: 'success', data: { subject } });
    } catch (error) {
      next(error);
    }
  }

  static async setSubjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await ClassSubjectsService.setSubjectStatus(
        req.params.id,
        req.body.isActive
      );
      res.status(200).json({ status: 'success', data: { subject } });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ClassSubjectsService.deleteSubject(req.params.id);
      res.status(200).json({ status: 'success', message: 'Subject deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const students = await ClassSubjectsService.getStudents({
        classNumber: req.query.classNumber ? Number(req.query.classNumber) : undefined,
        subjectId: req.query.subjectId as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.status(200).json({ status: 'success', results: students.length, data: { students } });
    } catch (error) {
      next(error);
    }
  }

  static async getMySubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'student') {
        throw new ForbiddenError('Only authenticated students can access their subjects');
      }
      const data = await ClassSubjectsService.getStudentSubjects(req.user.id);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async updateMySubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'student') {
        throw new ForbiddenError('Only authenticated students can update their subjects');
      }
      const data = await ClassSubjectsService.updateStudentSubjects(
        req.user.id,
        req.body.subjectIds
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async createSubjectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'student') {
        throw new ForbiddenError('Only authenticated students can request a subject');
      }
      const subjectRequest = await ClassSubjectsService.createSubjectRequest(
        req.user.id,
        req.body.requestedSubjectName
      );
      res.status(201).json({ status: 'success', data: { subjectRequest } });
    } catch (error) {
      next(error);
    }
  }

  static async getPendingRequests(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await ClassSubjectsService.getPendingRequests();
      res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
    } catch (error) {
      next(error);
    }
  }

  static async reviewRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewedBy = req.user?.id;
      if (!reviewedBy) throw new ForbiddenError('Admin authentication is required');
      const subjectRequest = await ClassSubjectsService.reviewRequest(
        req.params.id,
        req.body.status,
        reviewedBy
      );
      res.status(200).json({ status: 'success', data: { subjectRequest } });
    } catch (error) {
      next(error);
    }
  }
}
