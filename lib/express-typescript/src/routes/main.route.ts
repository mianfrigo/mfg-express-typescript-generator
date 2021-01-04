import { Router } from 'express';
import MainController from '../controllers/main.controller';
import { mainLimiter } from '../middleware/limiters';

const router = Router();
const mainController = new MainController();

router.get('/', mainLimiter, mainController.getMessage);

export default router;
