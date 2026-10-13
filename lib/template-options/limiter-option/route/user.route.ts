import { Router } from 'express';
import UserController from '../controllers/user.controller';
//{{limiter}} import { mainLimiter } from '../middleware/limiters';
//{{roles}} import { requireRole } from '../middleware/auth';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { createUserSchema } from '../validation/user.validation';
//{{zod}} import { updateUserSchema } from '../validation/user.validation';

const router = Router();
const userController = new UserController();

router.get('/', mainLimiter, userController.getUsers);

router.get('/:id', mainLimiter, userController.getSingleUser);

//{{zod}} router.post('/', mainLimiter, validate(createUserSchema), userController.createUsers);
//{{!zod}} router.post('/', mainLimiter, userController.createUsers);

//{{roles}} router.delete('/:id', mainLimiter, requireRole('admin'), userController.removeUser);
//{{!roles}} router.delete('/:id', mainLimiter, userController.removeUser);

//{{zod}} router.put('/:id', mainLimiter, validate(updateUserSchema), userController.updateUser);
//{{!zod}} router.put('/:id', mainLimiter, userController.updateUser);

export default router;
