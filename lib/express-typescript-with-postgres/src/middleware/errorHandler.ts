import { NextFunction, Request, Response } from 'express';
import createError, { HttpError } from 'http-errors';
import logger from '../config/logger.config';

export const notFound = (_req: Request, _res: Response, next: NextFunction) => {
  next(new createError.NotFound());
};

const statusOf = (err: HttpError & { code?: string }) => {
  if (err.status) return err.status;
  if (err.code === 'P2002') return 409; // unique constraint (duplicate email)
  if (err.code === 'P2025') return 404; // record to update/delete not found
  if (err.name === 'PrismaClientValidationError') return 400;
  return 500;
};

export const handleError = (
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = statusOf(err);
  logger.error(
    `statusCode: ${statusCode}; message: ${err.message}; stack: ${err.stack};`
  );
  // never echo internals (queries, table names) for server errors or duplicates
  const message =
    statusCode >= 500
      ? 'Internal Server Error'
      : statusCode === 409
        ? 'Resource already exists'
        : statusCode === 404 && !err.expose
          ? 'Not Found'
          : err.message;
  res.status(statusCode).json({ error: { statusCode, message } });
};
