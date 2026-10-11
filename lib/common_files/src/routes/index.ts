import { Router } from 'express';
//{{auth}} import { requireAuth } from '../middleware/auth';
//{{auth}} import authRoute from './auth.route';
import userRoute from './user.route';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

//{{auth}} router.use('/auth', authRoute);
//{{auth}} router.use('/user', requireAuth, userRoute);
//{{noauth}} router.use('/user', userRoute);

export default router;
