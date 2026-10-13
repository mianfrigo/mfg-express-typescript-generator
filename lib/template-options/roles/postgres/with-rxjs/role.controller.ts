import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { from } from 'rxjs';
import { isRole, ROLES } from '../config/roles';
import { prisma } from '../config/prisma';

// Admin-only (see role.route.ts): promote or demote a user.
// A missing id makes prisma throw P2025, which the error handler maps to 404.
export default class RoleController {
  setRole = (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.body ?? {};
    if (!isRole(role)) {
      next(new createHttpError.BadRequest(`role must be one of: ${ROLES.join(', ')}`));
      return;
    }
    from(
      prisma.user.update({
        where: { id: req.params.id as string },
        data: { role },
        omit: { password: true },
      })
    ).subscribe({
      next: (user) => res.status(200).json(user),
      error: next,
    });
  };
}
