import autoBind from 'auto-bind';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel from '../models/user.schema';

const User = UserModel;

export default class AuthController {
  constructor() {
    autoBind(this);
  }

  async authUser(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email: email });
      if (!user) {
        res.status(404);
        const error = new Error('User not found.');
        next(error);
        return;
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401);
        const error = new Error('Wrong password.');
        next(error);
        return;
      }
      const userToken = {
        auth_id: user._id,
        email: user.email,
      };
      const token = jwt.sign(userToken, process.env.SECRET_KEY, {
        expiresIn: '24h',
      });
      const decoded: any = jwt.decode(token);
      const authToken = {
        authToken: token,
        authToken_exp: decoded.exp,
        auth_user: user,
      };

      res.status(200).json(authToken);
    } catch (err) {
      res.status(err.status ?? 500);
      const error = new Error('Internal server error.');
      next(error);
    }
  }
}
