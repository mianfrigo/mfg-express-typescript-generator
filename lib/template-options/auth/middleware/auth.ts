import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

// Checked at boot (this module loads with the routes), not on the first login.
const secret = process.env.SECRET_KEY;
if (!secret) {
  throw new Error('SECRET_KEY is not set. Add it to your .env file.');
}

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const [scheme, token] = (req.header('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    next(new createHttpError.Unauthorized('Missing bearer token'));
    return;
  }
  try {
    jwt.verify(token, secret, { algorithms: ['HS256'] });
    next();
  } catch {
    next(new createHttpError.Unauthorized('Invalid or expired token'));
  }
};
