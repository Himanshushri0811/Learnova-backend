import { Request, Response, NextFunction } from 'express';
import { EnquiryService } from './enquiry.service.js';

export class EnquiryController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body;
      if (input.website) {
        res.status(201).json({
          status: 'success',
          message: 'Thank you for contacting Learnova! Your enquiry has been submitted successfully. Our team will contact you soon.',
        });
        return;
      }
      const classNumber = input.classNumber ?? Number(input.gradeLevel.match(/(\d+)$/)?.[1]);
      const enquiry = await EnquiryService.create({
        parentName: input.parentName ?? input.guardianName,
        studentName: input.studentName,
        phone: input.phone,
        email: input.email || undefined,
        classNumber,
        board: input.board || undefined,
        subject: input.subject,
        message: input.message,
        preferredContactTime: input.preferredContactTime,
      });
      res.status(201).json({
        status: 'success',
        message: 'Thank you for contacting Learnova! Your enquiry has been submitted successfully. Our team will contact you soon.',
        data: { enquiryId: enquiry._id, createdAt: enquiry.createdAt },
      });
    } catch (error) { next(error); }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await EnquiryService.list({
        search: req.query.search as string | undefined,
        classNumber: req.query.classNumber ? Number(req.query.classNumber) : undefined,
        status: req.query.status as 'NEW' | 'CONTACTED' | 'ADMISSION_CONFIRMED' | 'NOT_INTERESTED' | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 25),
      });
      res.status(200).json({ status: 'success', ...result });
    } catch (error) { next(error); }
  }

  static async stats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ status: 'success', data: await EnquiryService.stats() });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        status: 'success',
        data: { enquiry: await EnquiryService.getById(req.params.id) },
      });
    } catch (error) { next(error); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ status: 'fail', message: 'Admin authentication required' });
        return;
      }
      res.status(200).json({
        status: 'success',
        data: { enquiry: await EnquiryService.update(req.params.id, req.body, adminId) },
      });
    } catch (error) { next(error); }
  }

  static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ status: 'success', data: await EnquiryService.markRead(req.body.ids) });
    } catch (error) { next(error); }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await EnquiryService.delete(req.params.id);
      res.status(200).json({ status: 'success', message: 'Enquiry deleted successfully' });
    } catch (error) { next(error); }
  }
}
