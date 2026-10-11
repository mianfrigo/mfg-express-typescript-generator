import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.schema';

export default class AuthController {
  authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new createHttpError.BadRequest('email and password are required');
    }
    const secret = process.env.SECRET_KEY;
    if (!secret) throw new Error('SECRET_KEY is not set');

    const user = await UserModel.findOne({ email }).select('+password');
    // compare against '' when user is missing: same failure path, no user enumeration
    const ok = await bcrypt.compare(password, user?.password ?? '');
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
