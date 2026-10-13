import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

//{{roles}} declare module 'express-serve-static-core' {
//{{roles}}   interface Request {
//{{roles}}     auth?: { id: string; email: string; role: string };
//{{roles}}   }
//{{roles}} }

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
//{{!roles}}     jwt.verify(token, secret, { algorithms: ['HS256'] });
//{{roles}}     const payload = jwt.verify(token, secret, {
//{{roles}}       algorithms: ['HS256'],
//{{roles}}     }) as { auth_id: string; email: string; role: string };
//{{roles}}     req.auth = {
//{{roles}}       id: String(payload.auth_id),
//{{roles}}       email: payload.email,
//{{roles}}       role: payload.role,
//{{roles}}     };
    next();
  } catch {
    next(new createHttpError.Unauthorized('Invalid or expired token'));
  }
};

//{{roles}} // Use after requireAuth: requireRole('admin') answers 403 for anyone else.
//{{roles}} export const requireRole =
//{{roles}}   (...roles: string[]) =>
//{{roles}}   (req: Request, _res: Response, next: NextFunction) => {
//{{roles}}     if (!req.auth || !roles.includes(req.auth.role)) {
//{{roles}}       next(new createHttpError.Forbidden('Insufficient role'));
//{{roles}}       return;
//{{roles}}     }
//{{roles}}     next();
//{{roles}}   };
