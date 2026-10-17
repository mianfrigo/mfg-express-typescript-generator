import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
//{{rolespg}} import { prisma } from '../config/prisma';
//{{roles}} import { Role } from '../config/roles';
//{{rolesmongo}} import UserModel from '../models/user.schema';

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

//{{roles}} // The role in the token can be stale until it expires, so the admin checks
//{{roles}} // read the current one (a deleted user has none).
//{{roles}} const currentRole = async (id: string) => {
//{{rolespg}}   const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
//{{rolesmongo}}   const user = await UserModel.findById(id).select('role');
//{{roles}}   return user?.role as Role | undefined;
//{{roles}} };

// Use after requireAuth, on routes with an :id: a user may only act on their
// own record.
//{{roles}} // An admin may act on any record.
//{{roles}} export const requireSelf = async (
//{{!roles}} export const requireSelf = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const self = req.auth?.id === req.params.id;
//{{roles}}   const admin = !self && req.auth && (await currentRole(req.auth.id)) === 'admin';
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
//{{roles}}   async (req: Request, _res: Response, next: NextFunction) => {
//{{roles}}     const role = req.auth && (await currentRole(req.auth.id));
//{{roles}}     if (!role || !roles.includes(role)) {
//{{roles}}       next(new createHttpError.Forbidden('Insufficient role'));
//{{roles}}       return;
//{{roles}}     }
//{{roles}}     next();
//{{roles}}   };
