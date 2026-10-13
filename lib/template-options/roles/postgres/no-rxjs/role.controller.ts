import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import { prisma } from '../config/prisma';

const ROLES = ['user', 'admin'];

// Admin-only (see role.route.ts): promote or demote a user.
// A missing id makes prisma throw P2025, which the error handler maps to 404.
export default class RoleController {
  setRole = async (req: Request, res: Response) => {
    const { role } = req.body ?? {};
    if (!ROLES.includes(role)) {
      throw new createHttpError.BadRequest('role must be "user" or "admin"');
    }
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { role },
      omit: { password: true },
    });
    res.status(200).json(user);
  };
}
