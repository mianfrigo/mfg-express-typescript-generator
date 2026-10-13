import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { loginSchema } from '../validation/auth.validation';
//{{zod}} import { registerSchema } from '../validation/auth.validation';
//{{refresh}} import TokenController from '../controllers/token.controller';

const authController = new AuthController();
//{{refresh}} const tokenController = new TokenController();
const router = Router();

//{{zod}} router.post('/', validate(loginSchema), authController.authUser);
//{{!zod}} router.post('/', authController.authUser);

//{{zod}} router.post('/register', validate(registerSchema), authController.registerUser);
//{{!zod}} router.post('/register', authController.registerUser);
//{{refresh}} router.post('/refresh', tokenController.refresh);
//{{refresh}} router.post('/logout', tokenController.logout);

export default router;
