import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
//{{refresh}} import { ACCESS_TTL, issueRefreshToken } from '../services/tokens';
//{{!refresh}} const ACCESS_TTL = '24h';

// compared when the user does not exist, so both failures cost one bcrypt round
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export default class AuthController {
  registerUser = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body ?? {};
    if (
      [firstName, lastName, email, password].some((v) => typeof v !== 'string')
    ) {
      throw new createHttpError.BadRequest(
        'firstName, lastName, email and password are required'
      );
    }
    if (password.length < 8 || Buffer.byteLength(password) > 72) {
      throw new createHttpError.BadRequest(
        'password must be 8 to 72 bytes'
      );
    }
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: await bcrypt.hash(password, 10),
      },
      omit: { password: true },
    });
    res.status(201).json(user);
  };

  authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new createHttpError.BadRequest('email and password are required');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // always run one bcrypt compare so response time does not reveal valid emails
    const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new createHttpError.Unauthorized('Invalid credentials');
    }

//{{!roles}}     const token = jwt.sign({ auth_id: user.id, email: user.email }, env.secretKey, {
//{{!roles}}       expiresIn: ACCESS_TTL,
//{{!roles}}     });
//{{roles}}     const token = jwt.sign(
//{{roles}}       { auth_id: user.id, email: user.email, role: user.role },
//{{roles}}       env.secretKey,
//{{roles}}       { expiresIn: ACCESS_TTL }
//{{roles}}     );
    const { exp } = jwt.decode(token) as { exp: number };
//{{refresh}}     const refresh = await issueRefreshToken(String(user.id));
    const { password: _hash, ...authUser } = user;
    res.status(200).json({
      authToken: token,
      authToken_exp: exp,
      auth_user: authUser,
//{{refresh}}       ...refresh,
    });
  };
}
