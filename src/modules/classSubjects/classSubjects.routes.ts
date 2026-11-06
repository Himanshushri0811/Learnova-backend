import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ClassSubjectsController } from './classSubjects.controller.js';
import {
  createClassSubjectSchema,
  createSubjectRequestSchema,
  deleteClassSubjectSchema,
  getClassSubjectsSchema,
  getOverviewSchema,
  getSubjectStudentsSchema,
  reviewSubjectRequestSchema,
  subjectStatusSchema,
  updateClassSubjectSchema,
  updateMySubjectsSchema,
} from './classSubjects.schema.js';

const router = Router();

router.use(authenticate);
router.get('/mine', requireRole(['student']), ClassSubjectsController.getMySubjects);
router.put('/mine', requireRole(['student']), validate(updateMySubjectsSchema), ClassSubjectsController.updateMySubjects);
router.post('/mine/requests', requireRole(['student']), validate(createSubjectRequestSchema), ClassSubjectsController.createSubjectRequest);

router.use('/admin', requireRole(['admin']));
router.get('/admin/overview', validate(getOverviewSchema), ClassSubjectsController.getOverview);
router.get('/admin/subjects', validate(getClassSubjectsSchema), ClassSubjectsController.getClassSubjects);
router.post('/admin/subjects', validate(createClassSubjectSchema), ClassSubjectsController.createSubject);
router.put('/admin/subjects/:id', validate(updateClassSubjectSchema), ClassSubjectsController.updateSubject);
router.patch('/admin/subjects/:id/status', validate(subjectStatusSchema), ClassSubjectsController.setSubjectStatus);
router.delete('/admin/subjects/:id', validate(deleteClassSubjectSchema), ClassSubjectsController.deleteSubject);
router.get('/admin/students', validate(getSubjectStudentsSchema), ClassSubjectsController.getStudents);
router.get('/admin/requests', ClassSubjectsController.getPendingRequests);
router.patch('/admin/requests/:id', validate(reviewSubjectRequestSchema), ClassSubjectsController.reviewRequest);

export const classSubjectsRouter = router;
