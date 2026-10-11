import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { mainLimiter } from '../middleware/limiters';

const authController = new AuthController();
const router = Router();

router.post('/', mainLimiter, authController.authUser);

router.post('/register', mainLimiter, authController.registerUser);

export default router;
