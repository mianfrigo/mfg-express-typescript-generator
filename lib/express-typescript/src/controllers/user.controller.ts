import { NextFunction, Request, Response } from 'express';
import users from '../db/data';
import { boundClass } from 'autobind-decorator';

@boundClass
export default class UserController {
	constructor() {}

	getUsers(req: Request, res: Response, next: NextFunction) {
		res.status(200).json(users);
	}

	getSingleUser(req: Request, res: Response, next: NextFunction) {
		const { id } = req.params;
		const user = users.find((u) => u.id == +id);
		res.status(200).json(user);
	}

	removeUser(req: Request, res: Response, next: NextFunction) {
		const { id } = req.params;
		res.status(200).json({
			message: `User ${id} successfully removed`,
		});
	}

	updateUser(req: Request, res: Response, next: NextFunction) {
		const { id } = req.params;
		res.status(200).json({
			message: `User ${id} successfully updaded`,
		});
	}
}
