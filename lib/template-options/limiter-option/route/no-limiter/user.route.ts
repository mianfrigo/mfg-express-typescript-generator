import { Router } from 'express';
import UserController from '../controllers/user.controller';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { createUserSchema } from '../validation/user.validation';
//{{zod}} import { updateUserSchema } from '../validation/user.validation';

const router = Router();
const userController = new UserController();

router.get('/', userController.getUsers);

router.get('/:id', userController.getSingleUser);

//{{zod}} router.post('/', validate(createUserSchema), userController.createUsers);
//{{!zod}} router.post('/', userController.createUsers);

router.delete('/:id', userController.removeUser);

//{{zod}} router.put('/:id', validate(updateUserSchema), userController.updateUser);
//{{!zod}} router.put('/:id', userController.updateUser);

export default router;
