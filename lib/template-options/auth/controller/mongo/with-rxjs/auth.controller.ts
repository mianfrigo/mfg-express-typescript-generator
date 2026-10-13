import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { from, map, switchMap } from 'rxjs';
import UserModel from '../models/user.schema';

// compared when the user does not exist, so both failures cost one bcrypt round
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export default class AuthController {
  registerUser = (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, password } = req.body ?? {};
    if (
      [firstName, lastName, email, password].some((v) => typeof v !== 'string')
    ) {
      next(
        new createHttpError.BadRequest(
          'firstName, lastName, email and password are required'
        )
      );
      return;
    }
    if (password.length < 8) {
      next(
        new createHttpError.BadRequest('password must be at least 8 characters')
      );
      return;
    }
    from(bcrypt.hash(password, 10))
      .pipe(
        switchMap((hash) =>
          from(
            UserModel.create({ firstName, lastName, email, password: hash })
          )
        ),
        map((user) => {
          const { password: _hash, ...created } = user.toObject();
          return created;
        })
      )
      .subscribe({
        next: (body) => res.status(201).json(body),
        error: next,
      });
  };

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
          // always run one bcrypt compare so response time does not reveal valid emails
          from(bcrypt.compare(password, user?.password ?? DUMMY_HASH)).pipe(
            map((ok) => {
              if (!user || !ok) {
                throw new createHttpError.Unauthorized('Invalid credentials');
              }
              return user;
            })
          )
        ),
        map((user) => {
//{{!roles}}           const token = jwt.sign(
//{{!roles}}             { auth_id: user._id, email: user.email },
//{{!roles}}             secret,
//{{!roles}}             { expiresIn: '24h' }
//{{!roles}}           );
//{{roles}}           const token = jwt.sign(
//{{roles}}             { auth_id: user._id, email: user.email, role: user.role },
//{{roles}}             secret,
//{{roles}}             { expiresIn: '24h' }
//{{roles}}           );
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
