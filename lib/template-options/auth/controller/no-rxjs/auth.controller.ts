import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.schema';

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
    if (password.length < 8) {
      throw new createHttpError.BadRequest(
        'password must be at least 8 characters'
      );
    }
    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 10),
    });
    const { password: _hash, ...created } = user.toObject();
    res.status(201).json(created);
  };

  authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new createHttpError.BadRequest('email and password are required');
    }
    const secret = process.env.SECRET_KEY;
    if (!secret) throw new Error('SECRET_KEY is not set');

    const user = await UserModel.findOne({ email }).select('+password');
    // always run one bcrypt compare so response time does not reveal valid emails
    const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new createHttpError.Unauthorized('Invalid credentials');
    }

    const token = jwt.sign({ auth_id: user._id, email: user.email }, secret, {
      expiresIn: '24h',
    });
    const { exp } = jwt.decode(token) as { exp: number };
    const { password: _hash, ...authUser } = user.toObject();
    res.status(200).json({
      authToken: token,
      authToken_exp: exp,
      auth_user: authUser,
    });
  };
}
