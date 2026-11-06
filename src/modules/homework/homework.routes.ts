import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { HomeworkController } from './homework.controller.js';
import {
  createHomeworkSchema,
  getHomeworkQuerySchema,
  homeworkIdSchema,
  notificationQuerySchema,
  submitHomeworkSchema,
  updateHomeworkSchema,
  updateNotificationSchema,
} from './homework.schema.js';

const router = Router();
router.use(authenticate);

router.get('/mine', requireRole(['student']), HomeworkController.mine);
router.get('/mine/:id', requireRole(['student']), validate(homeworkIdSchema), HomeworkController.myDetail);
router.patch('/mine/:id/complete', requireRole(['student']), validate(homeworkIdSchema), HomeworkController.completeMine);
router.post('/mine/:id/submissions', requireRole(['student']), validate(submitHomeworkSchema), HomeworkController.submitMine);

router.use('/admin', requireRole(['admin']));
router.get('/admin/overview', validate(getHomeworkQuerySchema), HomeworkController.overview);
router.get('/admin/assignments', validate(getHomeworkQuerySchema), HomeworkController.assignments);
router.get('/admin/assignments/:id/submissions', validate(homeworkIdSchema), HomeworkController.submissions);
router.post('/admin/assignments', validate(createHomeworkSchema), HomeworkController.create);
router.put('/admin/assignments/:id', validate(updateHomeworkSchema), HomeworkController.update);
router.delete('/admin/assignments/:id', validate(homeworkIdSchema), HomeworkController.delete);
router.get('/admin/notifications', validate(notificationQuerySchema), HomeworkController.notifications);
router.patch('/admin/notifications/:id', validate(updateNotificationSchema), HomeworkController.updateNotification);

export const homeworkRouter = router;
