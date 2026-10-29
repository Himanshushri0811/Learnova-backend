import { ZodError } from 'zod';
export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Assign parsed/sanitized values back to request
            req.body = parsed.body;
            req.query = parsed.query;
            req.params = parsed.params;
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    status: 'fail',
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.').replace(/^(body|query|params)\./, ''),
                        message: err.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
};
