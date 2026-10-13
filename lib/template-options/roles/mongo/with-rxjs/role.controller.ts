import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { from, map } from 'rxjs';
import { isRole, ROLES } from '../config/roles';
import UserModel from '../models/user.schema';

const orNotFound = <T>(value: T | null) => {
  if (!value) throw new createHttpError.NotFound();
  return value;
};

// Admin-only (see role.route.ts): promote or demote a user.
export default class RoleController {
  setRole = (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.body ?? {};
    if (!isRole(role)) {
      next(new createHttpError.BadRequest(`role must be one of: ${ROLES.join(', ')}`));
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
