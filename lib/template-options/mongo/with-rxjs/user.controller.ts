import autoBind from 'auto-bind';
import { NextFunction, Request, Response } from 'express';
import UserModel from '../models/user.schema';
import { forkJoin, from, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

const User = UserModel;
export default class UserController {
  constructor() {
    autoBind(this);
  }

  createUsers(req: Request, res: Response, next: NextFunction) {
    const newUser = new User({ ...req.body });
    from(newUser.save()).subscribe(
      (user) => {
        res.status(200).json(user);
      },
      (err) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      }
    );
  }

  getUsers(req: Request, res: Response, next: NextFunction) {
    from(User.find()).subscribe(
      (users) => {
        res.status(200).json(users);
      },
      (err) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      }
    );
  }

  getSingleUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    from(User.findOne({ _id: id })).subscribe(
      (user) => {
        res.status(200).json(user);
      },
      (err) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      }
    );
  }

  removeUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    from(User.deleteOne({ _id: id })).subscribe(
      () => {
        res.status(200).json({
          message: `User ${id} successfully deleted`,
        });
      },
      (err) => {
        res.status(err.status);
        const error = new Error('Error');
        next(error);
      }
    );
  }

  updateUser(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const updated = { ...req.body };
    from(User.findOne({ _id: id }))
      .pipe(
        switchMap((user) => {
          if (!user) {
            return throwError({ status: 404 });
          }
          return from(User.updateOne({ _id: id }, updated, { new: true }));
        })
      )
      .subscribe(
        (user) => {
          res.status(200).json(user);
        },
        (err) => {
          res.status(err.status);
          const error = new Error('Error');
          next(error);
        }
      );
  }
}
