import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import UserModel from '../models/user.schema';

const FIELDS = ['firstName', 'lastName', 'email'];
const pick = (body: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => FIELDS.includes(k)));

export default class UserController {
  createUsers = async (req: Request, res: Response) => {
    const user = await UserModel.create(pick(req.body));
    res.status(201).json(user);
  };

  getUsers = async (_req: Request, res: Response) => {
    res.status(200).json(await UserModel.find());
  };

  getSingleUser = async (req: Request, res: Response) => {
    const user = await UserModel.findById(req.params.id);
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };

  removeUser = async (req: Request, res: Response) => {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json({
      message: `User ${req.params.id} successfully deleted`,
    });
  };

  updateUser = async (req: Request, res: Response) => {
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      pick(req.body),
      { returnDocument: 'after', runValidators: true }
    );
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };
}
