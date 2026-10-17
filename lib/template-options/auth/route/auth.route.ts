import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
//{{limiter}} import { authLimiter, mainLimiter } from '../middleware/limiters';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { loginSchema } from '../validation/auth.validation';
//{{zod}} import { registerSchema } from '../validation/auth.validation';
//{{refreshzod}} import { refreshSchema } from '../validation/auth.validation';
//{{refresh}} import TokenController from '../controllers/token.controller';

const authController = new AuthController();
//{{refresh}} const tokenController = new TokenController();
const router = Router();

//{{zod}} router.post('/', authLimiter, validate(loginSchema), authController.authUser);
//{{!zod}} router.post('/', authLimiter, authController.authUser);

//{{zod}} router.post('/register', mainLimiter, authLimiter, validate(registerSchema), authController.registerUser);
//{{!zod}} router.post('/register', mainLimiter, authLimiter, authController.registerUser);
//{{refresh}} router.post('/refresh', authLimiter, validate(refreshSchema), tokenController.refresh);
//{{refresh}} router.post('/logout', authLimiter, validate(refreshSchema), tokenController.logout);

export default router;
