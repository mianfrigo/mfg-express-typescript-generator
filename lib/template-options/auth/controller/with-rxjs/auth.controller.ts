import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { from, map, switchMap } from 'rxjs';
import UserModel from '../models/user.schema';

export default class AuthController {
  authUser = (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      next(new createHttpError.BadRequest('email and password are required'));
      return;
    }
    const secret = process.env.SECRET_KEY;
    if (!secret) {
      next(new Error('SECRET_KEY is not set'));
      return;
    }

    from(UserModel.findOne({ email }).select('+password'))
      .pipe(
        switchMap((user) =>
          // compare against '' when user is missing: same failure path
          from(bcrypt.compare(password, user?.password ?? '')).pipe(
            map((ok) => {
              if (!user || !ok) {
                throw new createHttpError.Unauthorized('Invalid credentials');
              }
              return user;
            })
          )
        ),
        map((user) => {
          const token = jwt.sign(
            { auth_id: user._id, email: user.email },
            secret,
            { expiresIn: '24h' }
          );
          const { exp } = jwt.decode(token) as { exp: number };
          const { password: _hash, ...authUser } = user.toObject();
          return { authToken: token, authToken_exp: exp, auth_user: authUser };
        })
      )
      .subscribe({
        next: (body) => res.status(200).json(body),
        error: next,
      });
  };
}
