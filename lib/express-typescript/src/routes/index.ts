import { Router } from 'express';
import mainRoute from './main.route';

const router = Router();

router.use('/main', mainRoute);

export default router;
