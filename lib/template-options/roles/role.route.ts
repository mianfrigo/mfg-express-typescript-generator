import { Router } from 'express';
import RoleController from '../controllers/role.controller';
import { requireRole } from '../middleware/auth';
//{{limiter}} import { mainLimiter } from '../middleware/limiters';
//{{zod}} import { validate } from '../middleware/validate';
//{{zod}} import { roleSchema } from '../validation/role.validation';

const roleController = new RoleController();
const router = Router();

// Mounted under /user behind requireAuth. It only handles PATCH /:id/role;
// every other /user request falls through to user.route.ts.
const middleware = [
//{{limiter}}   mainLimiter,
  requireRole('admin'),
//{{zod}}   validate(roleSchema),
];

router.patch('/:id/role', ...middleware, roleController.setRole);

export default router;
