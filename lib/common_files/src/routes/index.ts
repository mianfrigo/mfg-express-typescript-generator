import { Router } from 'express';
//{{mongo}} import mongoose from 'mongoose';
//{{postgres}} import { prisma } from '../config/prisma';
//{{auth}} import { requireAuth } from '../middleware/auth';
//{{auth}} import authRoute from './auth.route';
//{{roles}} import roleRoute from './role.route';
import userRoute from './user.route';

const router = Router();

// Liveness: the process is up.
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: the process can reach its database (always ready without one).
router.get('/ready', async (_req, res) => {
  try {
//{{postgres}}     await prisma.$queryRaw`SELECT 1`;
//{{mongo}}     if (mongoose.connection.readyState !== 1) throw new Error('mongo not connected');
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

//{{auth}} router.use('/auth', authRoute);
//{{roles}} router.use('/user', requireAuth, roleRoute);
//{{auth}} router.use('/user', requireAuth, userRoute);
//{{!auth}} router.use('/user', userRoute);

export default router;
