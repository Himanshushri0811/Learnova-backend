
import { Router } from 'express';
import {
    createFeeController,
    getFeesController,
    getFeeByIdController,
    recordPaymentController,
    updateFeeController,
} from './fees.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
    createFeeSchema,
    recordPaymentSchema,
    updateFeeSchema,
    getFeesQuerySchema,
    feeIdParamSchema,
} from './fees.schema.js';

const router = Router();

// All fee routes require authentication.
router.use(authenticate);

// Only admins can view and manage tuition fee records.
router.use(requireRole(['admin']));
router.get(
    '/',
    validate(getFeesQuerySchema),
    getFeesController,
);

router.post(
    '/',
    validate(createFeeSchema),
    createFeeController,
);

router.get(
    '/:id',
    validate(feeIdParamSchema),
    getFeeByIdController,
);

router.patch(
    '/:id',
    validate(updateFeeSchema),
    updateFeeController,
);

router.post(
    '/:id/payments',
    validate(recordPaymentSchema),
    recordPaymentController,
);

export const feesRouter = router;
