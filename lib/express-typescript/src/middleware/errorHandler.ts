import { NextFunction, Request, Response } from 'express';
import createError, { HttpError } from 'http-errors';
import logger from '../config/logger.config';

export const notFound = (_req: Request, _res: Response, next: NextFunction) => {
  next(new createError.NotFound());
};

const statusOf = (err: HttpError & { code?: number }) => {
  if (err.status) return err.status;
  if (err.name === 'CastError' || err.name === 'ValidationError') return 400;
  if (err.code === 11000) return 409; // mongo duplicate key
  return 500;
};

export const handleError = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // the response already started: let Express close the connection
  if (res.headersSent) {
    next(err);
    return;
  }
  const statusCode = statusOf(err);
  // the query string may hold secrets, so only the path is logged
  const where = `${req.method} ${req.originalUrl.split('?')[0]}`;
  if (statusCode >= 500) {
    logger.error(`${where} ${statusCode}: ${err.message}; stack: ${err.stack}`);
  } else {
    logger.warn(`${where} ${statusCode}: ${err.message}`);
  }
  // never echo internals (db names, stack hints) for server errors or duplicate keys
  const message =
    statusCode >= 500
      ? 'Internal Server Error'
      : statusCode === 409
        ? 'Resource already exists'
        : err.message;
  res.status(statusCode).json({ error: { statusCode, message } });
};
