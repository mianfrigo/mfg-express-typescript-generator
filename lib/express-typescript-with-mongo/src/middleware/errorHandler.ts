import { NextFunction, Request, Response } from 'express';
import logger from '../config/logger.config';
import createError, { HttpError } from 'http-errors';

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(404);
  const error: any = new createError.NotFound();
  next(error);
};

export const handleError = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const jsonError = {
    error: {
      statusCode: res.statusCode || 500,
      message: err.message,
    },
  };
  logger.error(
    `statusCode: ${jsonError.error.statusCode}; statusText: ${jsonError.error.message}; stacks: ${err.stack};`
  );
  res.status(jsonError.error.statusCode).json(jsonError);
};
