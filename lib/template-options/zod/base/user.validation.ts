import { z } from 'zod';

export const createUserSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.email(),
  gender: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial();
