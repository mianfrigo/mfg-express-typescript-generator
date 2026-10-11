import { Router } from 'express';
import AuthController from '../controllers/auth.controller';

const authController = new AuthController();
const router = Router();

router.post('/', authController.authUser);

export default router;
