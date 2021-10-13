import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { forkJoin, from, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import UserModel from '../models/user.schema';
import bcrypt from 'bcryptjs';
import createHttpError from 'http-errors';
import { boundClass } from 'autobind-decorator';

const User = UserModel;

@boundClass
export default class AuthController {
	constructor() {}

	authUser(req: Request, res: Response, next: NextFunction) {
		const { email, password } = req.body;
		from(User.findOne({ email: email }))
			.pipe(
				switchMap((user: any) => {
					if (!user) {
						return throwError(() => new createHttpError.NotFound());
					}
					return forkJoin([
						of(user),
						from(bcrypt.compare(password, user.password)),
					]);
				})
			)
			.subscribe({
				next: ([user, result]) => {
					if (!result) {
						res.status(401);
						next(new createHttpError.Forbidden('Wrong password'));
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
				},
				error: (err) => {
					next(err);
				},
			});
	}
}
