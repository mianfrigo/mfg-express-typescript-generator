import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { mainLimiter } from '../middleware/limiters';

const router = Router();
const userController = new UserController();

router.get('/', mainLimiter, userController.getUsers);

router.get('/:id', mainLimiter, userController.getSingleUser);

router.delete('/:id', mainLimiter, userController.removeUser);

router.put('/:id', mainLimiter, userController.updateUser);

export default router;
