import rateLimit from 'express-rate-limit';

export const mainLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 100,
  message: {
    status: 429,
    message: 'Too Many Requests',
  },
});

// Login, register and refresh: only failed attempts count, so guessing
// passwords or tokens is capped without throttling normal use.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: {
    status: 429,
    message: 'Too Many Requests',
  },
});
