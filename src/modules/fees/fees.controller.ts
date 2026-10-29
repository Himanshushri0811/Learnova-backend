
import { Request, Response, NextFunction } from 'express';
import {
    createFee,
    getFees,
    getFeeById,
    recordPayment,
    updateFee,
} from './fees.service.js';

export const createFeeController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const fee = await createFee(req.body);

        res.status(201).json({
            status: 'success',
            data: { fee },
        });
    } catch (error) {
        next(error);
    }
};

export const getFeesController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const filters = {
            ...(typeof req.query.studentId === 'string'
                ? { studentId: req.query.studentId }
                : {}),
            ...(typeof req.query.academicMonth === 'string'
                ? { academicMonth: req.query.academicMonth }
                : {}),
        };

        const fees = await getFees(filters);

        res.status(200).json({
            status: 'success',
            results: fees.length,
            data: { fees },
        });
    } catch (error) {
        next(error);
    }
};

export const getFeeByIdController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const fee = await getFeeById(req.params.id);

        res.status(200).json({
            status: 'success',
            data: { fee },
        });
    } catch (error) {
        next(error);
    }
};

export const recordPaymentController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const fee = await recordPayment(req.params.id, req.body);

        res.status(200).json({
            status: 'success',
            data: { fee },
        });
    } catch (error) {
        next(error);
    }
};

export const updateFeeController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const fee = await updateFee(req.params.id, req.body);

        res.status(200).json({
            status: 'success',
            data: { fee },
        });
    } catch (error) {
        next(error);
    }
};
