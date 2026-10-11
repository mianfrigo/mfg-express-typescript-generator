import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import users from '../db/data';
import { pageOf, parsePaging } from '../utils/pagination';

export default class UserController {
  getUsers = (req: Request, res: Response) => {
    const { page, limit, skip } = parsePaging(req.query);
    const slice = users.slice(skip, skip + limit);
    res.status(200).json(pageOf(slice, users.length, page, limit));
  };

  getSingleUser = (req: Request, res: Response) => {
    const user = users.find((u) => u.id === Number(req.params.id));
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };

  createUsers = (req: Request, res: Response) => {
    const { first_name, last_name, email, gender } = req.body ?? {};
    if (![first_name, last_name, email].every((v) => typeof v === 'string')) {
      throw new createHttpError.BadRequest(
        'first_name, last_name and email are required'
      );
    }
    const user = {
      id: users.length + 1,
      first_name,
      last_name,
      email,
      gender,
    };
    users.push(user);
    res.status(201).json(user);
  };

  removeUser = (req: Request, res: Response) => {
    res.status(200).json({
      message: `User ${req.params.id} successfully removed`,
    });
  };

  updateUser = (req: Request, res: Response) => {
    res.status(200).json({
      message: `User ${req.params.id} successfully updated`,
    });
  };
}
