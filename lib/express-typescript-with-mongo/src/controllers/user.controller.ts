import autoBind from 'auto-bind';
import { NextFunction, Request, Response } from 'express';
import UserModel from '../models/user.schema';

const User = UserModel;
export default class UserController {
  constructor() {
    autoBind(this);
  }

  createUsers(req: Request, res: Response, next: NextFunction) {
    const newUser = new User({ ...req.body });
    newUser
      .save()
      .then((user: any) => {
        res.status(200).json(user);
      })
      .catch((err: any) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      });
  }

  getUsers(req: Request, res: Response, next: NextFunction) {
    User.find()
      .then((users: any) => {
        res.status(200).json(users);
      })
      .catch((err: any) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      });
  }

  getSingleUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    User.findOne({ _id: id })
      .then((user: any) => {
        res.status(200).json(user);
      })
      .catch((err: any) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      });
  }

  removeUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    User.deleteOne({ _id: id })
      .then(() => {
        res.status(200).json({
          message: `User ${id} successfully deleted`,
        });
      })
      .catch((err: any) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      });
  }

  updateUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const user = { ...req.body };
    User.findOneAndUpdate({ _id: id }, user, { new: true })
      .then((updated: any) => {
        res.status(200).json(updated);
      })
      .catch((err: any) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      });
  }
}
