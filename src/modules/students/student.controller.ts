import { Request, Response, NextFunction } from 'express';
import { StudentService } from './student.service.js';

export class StudentController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await StudentService.createStudent(req.body);
      res.status(201).json({
        status: 'success',
        data: { student },
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const gradeLevel = req.query.gradeLevel as string | undefined;
      const search = req.query.search as string | undefined;

      const students = await StudentService.getStudents({
        includeArchived,
        gradeLevel,
        search,
      });

      res.status(200).json({
        status: 'success',
        results: students.length,
        data: { students },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await StudentService.getStudentById(req.params.id);
      res.status(200).json({
        status: 'success',
        data: { student },
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await StudentService.updateStudent(req.params.id, req.body);
      res.status(200).json({
        status: 'success',
        data: { student },
      });
    } catch (err) {
      next(err);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await StudentService.archiveStudent(req.params.id);
      res.status(200).json({
        status: 'success',
        message: 'Student archived successfully (academic history preserved)',
        data: { student },
      });
    } catch (err) {
      next(err);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await StudentService.restoreStudent(req.params.id);
      res.status(200).json({
        status: 'success',
        message: 'Student record restored',
        data: { student },
      });
    } catch (err) {
      next(err);
    }
  }
}

