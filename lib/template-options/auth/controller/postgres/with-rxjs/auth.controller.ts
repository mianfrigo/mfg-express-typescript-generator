import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { from, map, switchMap } from 'rxjs';
import { prisma } from '../config/prisma';

//{{refresh}} import { ACCESS_TTL, issueRefreshToken } from '../services/tokens';
//{{!refresh}} const ACCESS_TTL = '24h';

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
    if (password.length < 8 || Buffer.byteLength(password) > 72) {
      next(
        new createHttpError.BadRequest('password must be 8 to 72 bytes')
      );
      return;
    }
    from(bcrypt.hash(password, 10))
      .pipe(
        switchMap((hash) =>
          from(
            prisma.user.create({
              data: { firstName, lastName, email, password: hash },
              omit: { password: true },
            })
          )
        )
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

    from(prisma.user.findUnique({ where: { email } }))
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
//{{!roles}}             { auth_id: user.id, email: user.email },
//{{!roles}}             secret,
//{{!roles}}             { expiresIn: ACCESS_TTL }
//{{!roles}}           );
//{{roles}}           const token = jwt.sign(
//{{roles}}             { auth_id: user.id, email: user.email, role: user.role },
//{{roles}}             secret,
//{{roles}}             { expiresIn: ACCESS_TTL }
//{{roles}}           );
          const { exp } = jwt.decode(token) as { exp: number };
          const { password: _hash, ...authUser } = user;
          return { authToken: token, authToken_exp: exp, auth_user: authUser };
        }),
//{{refresh}}         switchMap((body) =>
//{{refresh}}           from(issueRefreshToken(String(body.auth_user.id))).pipe(
//{{refresh}}             map((refresh) => ({ ...body, ...refresh }))
//{{refresh}}           )
//{{refresh}}         )
      )
      .subscribe({
        next: (body) => res.status(200).json(body),
        error: next,
      });
  };
}
