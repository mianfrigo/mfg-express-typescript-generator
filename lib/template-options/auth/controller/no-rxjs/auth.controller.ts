import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel from '../models/user.schema';
import createHttpError from 'http-errors';
import { boundClass } from 'autobind-decorator';

const User = UserModel;

@boundClass
export default class AuthController {
	constructor() {}

	async authUser(req: Request, res: Response, next: NextFunction) {
		const { email, password } = req.body;
		try {
			const user = await User.findOne({ email: email });
			if (!user) {
				res.status(404);
				const error = new createHttpError.NotFound();
				next(error);
				return;
			}
			const passwordMatch = await bcrypt.compare(password, user.password);
			if (!passwordMatch) {
				res.status(401);
				const error = new createHttpError.Forbidden('Wrong password');
				next(error);
				return;
			}
			const userToken = {
				auth_id: user._id,
				email: user.email,
			};
			const token = jwt.sign(userToken, 'process.env.SECRET_KEY', {
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
			next(err);
		}
	}
}
