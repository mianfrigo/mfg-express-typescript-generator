import { NextFunction, Request, Response } from 'express';
import logger from '../config/logger.config';

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(404);
  const error: any = new Error(`Not found - ${req.originalUrl}`);
  next(error);
};

export const handleError = (
  err: any,
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
  res.status(res.statusCode || 500).json(jsonError);
};
