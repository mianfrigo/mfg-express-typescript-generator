import { z } from 'zod';
import { ROLES } from '../config/roles';

export const roleSchema = z.object({
  role: z.enum(ROLES),
});
