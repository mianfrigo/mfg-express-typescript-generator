import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { ZodType } from 'zod';

// Validates req.body against a zod schema. On success req.body becomes the
// parsed value (unknown keys stripped); on failure the 400 names each field.
export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
      next(new createHttpError.BadRequest(message));
      return;
    }
    req.body = result.data;
    next();
  };
