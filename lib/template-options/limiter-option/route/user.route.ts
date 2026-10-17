import { Router } from 'express';
import UserController from '../controllers/user.controller';
//{{limiter}} import { mainLimiter } from '../middleware/limiters';
//{{auth}} import { requireSelf } from '../middleware/auth';
//{{roles}} import { requireRole } from '../middleware/auth';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { createUserSchema } from '../validation/user.validation';
//{{zod}} import { updateUserSchema } from '../validation/user.validation';

const router = Router();
const userController = new UserController();

router.get('/', mainLimiter, userController.getUsers);

router.get('/:id', mainLimiter, userController.getSingleUser);

//{{zod}} router.post('/', mainLimiter, requireRole('admin'), validate(createUserSchema), userController.createUsers);
//{{!zod}} router.post('/', mainLimiter, requireRole('admin'), userController.createUsers);

router.delete('/:id', mainLimiter, requireRole('admin'), requireSelf, userController.removeUser);

//{{zod}} router.put('/:id', mainLimiter, requireSelf, validate(updateUserSchema), userController.updateUser);
//{{!zod}} router.put('/:id', mainLimiter, requireSelf, userController.updateUser);

export default router;
