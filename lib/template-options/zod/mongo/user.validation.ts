import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
});

export const updateUserSchema = createUserSchema.partial();
