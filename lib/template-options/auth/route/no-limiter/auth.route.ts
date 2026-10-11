import { Router } from 'express';
import AuthController from '../controllers/auth.controller';

const authController = new AuthController();
const router = Router();

router.post('/', authController.authUser);

router.post('/register', authController.registerUser);

export default router;
