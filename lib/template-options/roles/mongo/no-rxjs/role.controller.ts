import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import { isRole, ROLES } from '../config/roles';
import UserModel from '../models/user.schema';

// Admin-only (see role.route.ts): promote or demote a user.
export default class RoleController {
  setRole = async (req: Request, res: Response) => {
    const { role } = req.body ?? {};
    if (!isRole(role)) {
      throw new createHttpError.BadRequest(`role must be one of: ${ROLES.join(', ')}`);
    }
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { role },
      { returnDocument: 'after', runValidators: true }
    );
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };
}
