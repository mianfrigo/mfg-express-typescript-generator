import express, { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { mainLimiter } from '../middleware/limiters';

const authController = new AuthController();
// eslint-disable-next-line new-cap
const router: Router = express.Router();

router.post('/', mainLimiter, authController.authUser);

export default router;
