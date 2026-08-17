import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Zod strips unknown keys only from its return value. Assign the parsed
      // body back so undeclared fields never reach controllers/services.
      // Guarded: schemas that declare no `body` (e.g. an `:id` params-only
      // schema used ahead of a second, body-validating middleware in a
      // chained route) parse to `parsed.body === undefined` — assigning that
      // unconditionally would wipe out req.body before the next validator runs.
      // req.query / req.params are intentionally left untouched (see
      // DARE2CARE-53 spec — query schemas `.transform()` types, e.g. page/limit
      // to number, and reassigning would change runtime types read downstream).
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
  };
};
