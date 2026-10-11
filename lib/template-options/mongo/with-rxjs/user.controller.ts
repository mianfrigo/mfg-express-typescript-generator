import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { from, map } from 'rxjs';
import UserModel from '../models/user.schema';

const FIELDS = ['firstName', 'lastName', 'email'];
const pick = (body: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => FIELDS.includes(k)));

const orNotFound = <T>(value: T | null) => {
  if (!value) throw new createHttpError.NotFound();
  return value;
};

const send = (res: Response, next: NextFunction, status = 200) => ({
  next: (body: unknown) => res.status(status).json(body),
  error: next,
});

export default class UserController {
  createUsers = (req: Request, res: Response, next: NextFunction) => {
    from(UserModel.create(pick(req.body))).subscribe(send(res, next, 201));
  };

  getUsers = (_req: Request, res: Response, next: NextFunction) => {
    from(UserModel.find()).subscribe(send(res, next));
  };

  getSingleUser = (req: Request, res: Response, next: NextFunction) => {
    from(UserModel.findById(req.params.id))
      .pipe(map(orNotFound))
      .subscribe(send(res, next));
  };

  removeUser = (req: Request, res: Response, next: NextFunction) => {
    from(UserModel.findByIdAndDelete(req.params.id))
      .pipe(
        map(orNotFound),
        map(() => ({ message: `User ${req.params.id} successfully deleted` }))
      )
      .subscribe(send(res, next));
  };

  updateUser = (req: Request, res: Response, next: NextFunction) => {
    from(
      UserModel.findByIdAndUpdate(req.params.id, pick(req.body), {
        returnDocument: 'after',
        runValidators: true,
      })
    )
      .pipe(map(orNotFound))
      .subscribe(send(res, next));
  };
}
