import rateLimit from 'express-rate-limit';

export const mainLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: {
    status: 429,
    message: 'Too Many Requests',
  },
});
