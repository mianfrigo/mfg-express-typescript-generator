import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { mainLimiter } from '../middleware/limiters';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { loginSchema } from '../validation/auth.validation';
//{{zod}} import { registerSchema } from '../validation/auth.validation';
//{{refresh}} import TokenController from '../controllers/token.controller';

const authController = new AuthController();
//{{refresh}} const tokenController = new TokenController();
const router = Router();

//{{zod}} router.post('/', mainLimiter, validate(loginSchema), authController.authUser);
//{{!zod}} router.post('/', mainLimiter, authController.authUser);

//{{zod}} router.post('/register', mainLimiter, validate(registerSchema), authController.registerUser);
//{{!zod}} router.post('/register', mainLimiter, authController.registerUser);
//{{refresh}} router.post('/refresh', mainLimiter, tokenController.refresh);
//{{refresh}} router.post('/logout', mainLimiter, tokenController.logout);

export default router;
