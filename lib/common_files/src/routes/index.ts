import { Router } from 'express';
//{{auth}} import authRoute from './auth.route';
import userRoute from './user.route';

const router = Router();

router.use('/user', userRoute);
//{{auth}} router.use('/auth', authRoute);

export default router;
