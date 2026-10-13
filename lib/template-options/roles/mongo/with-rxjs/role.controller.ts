import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { from, map } from 'rxjs';
import UserModel from '../models/user.schema';

const ROLES = ['user', 'admin'];

const orNotFound = <T>(value: T | null) => {
  if (!value) throw new createHttpError.NotFound();
  return value;
};

// Admin-only (see role.route.ts): promote or demote a user.
export default class RoleController {
  setRole = (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.body ?? {};
    if (!ROLES.includes(role)) {
      next(new createHttpError.BadRequest('role must be "user" or "admin"'));
      return;
    }
    from(
      UserModel.findByIdAndUpdate(
        req.params.id,
        { role },
        { returnDocument: 'after', runValidators: true }
      )
    )
      .pipe(map(orNotFound))
      .subscribe({
        next: (user) => res.status(200).json(user),
        error: next,
      });
  };
}
