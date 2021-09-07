import autoBind from 'auto-bind';
import { NextFunction, Request, Response } from 'express';
import UserModel from '../models/user.schema';
import createHttpError from 'http-errors';

const User = UserModel;
export default class UserController {
  constructor() {
    autoBind(this);
  }

  async createUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const newUser = new User({ ...req.body });
      const userSaved = await newUser.save();
      res.status(200).json(userSaved);
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await User.find();
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }

  async getSingleUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const user = await User.findOne({ _id: id });
      if (user) {
        res.status(200).json(user);
        return;
      }
      res.status(404);
      const error = new createHttpError.NotFound();
      next(error);
    } catch (err) {
      next(err);
    }
  }

  async removeUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const userDeleted = await User.deleteOne({ _id: id });
      res.status(200).json({
        message: `User ${id} successfully deleted`,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const user = { ...req.body };
    try {
      const updated = await User.findOneAndUpdate({ _id: id }, user, {
        new: true,
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}
