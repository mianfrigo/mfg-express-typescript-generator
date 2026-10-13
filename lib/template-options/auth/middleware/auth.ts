import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

// 'express' itself: pnpm does not expose its transitive types to the app
declare module 'express' {
  interface Request {
    auth?: {
      id: string;
      email: string;
//{{roles}}       role: string;
    };
  }
}

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
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as {
      auth_id: string;
      email: string;
//{{roles}}       role: string;
    };
    req.auth = {
      id: String(payload.auth_id),
      email: payload.email,
//{{roles}}       role: payload.role,
    };
    next();
  } catch {
    next(new createHttpError.Unauthorized('Invalid or expired token'));
  }
};

// Use after requireAuth, on routes with an :id: a user may only act on their
// own record.
//{{roles}} // An admin may act on any record.
export const requireSelf = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const self = req.auth?.id === req.params.id;
//{{roles}}   const admin = req.auth?.role === 'admin';
//{{roles}}   if (self || admin) {
//{{!roles}}   if (self) {
    next();
    return;
  }
  next(new createHttpError.Forbidden('You can only change your own record'));
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
