import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
//{{roles}} import { Role } from '../config/roles';

// 'express' itself: pnpm does not expose its transitive types to the app
declare module 'express' {
  interface Request {
    auth?: {
      id: string;
      email: string;
//{{roles}}       role: Role;
    };
  }
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
    const payload = jwt.verify(token, env.secretKey, {
      algorithms: ['HS256'],
    }) as {
      auth_id: string;
      email: string;
//{{roles}}       role: Role;
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
//{{roles}}   (...roles: Role[]) =>
//{{roles}}   (req: Request, _res: Response, next: NextFunction) => {
//{{roles}}     if (!req.auth || !roles.includes(req.auth.role)) {
//{{roles}}       next(new createHttpError.Forbidden('Insufficient role'));
//{{roles}}       return;
//{{roles}}     }
//{{roles}}     next();
//{{roles}}   };
