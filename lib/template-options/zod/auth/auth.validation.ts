import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8).max(72),
});

//{{refresh}} export const refreshSchema = z.object({
//{{refresh}}   refreshToken: z.string().min(1),
//{{refresh}} });
