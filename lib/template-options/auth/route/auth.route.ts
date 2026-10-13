import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
//{{limiter}} import { authLimiter } from '../middleware/limiters';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { loginSchema } from '../validation/auth.validation';
//{{zod}} import { registerSchema } from '../validation/auth.validation';
//{{refresh}} import TokenController from '../controllers/token.controller';

const authController = new AuthController();
//{{refresh}} const tokenController = new TokenController();
const router = Router();

//{{zod}} router.post('/', authLimiter, validate(loginSchema), authController.authUser);
//{{!zod}} router.post('/', authLimiter, authController.authUser);

//{{zod}} router.post('/register', authLimiter, validate(registerSchema), authController.registerUser);
//{{!zod}} router.post('/register', authLimiter, authController.registerUser);
//{{refresh}} router.post('/refresh', authLimiter, tokenController.refresh);
//{{refresh}} router.post('/logout', authLimiter, tokenController.logout);

export default router;
