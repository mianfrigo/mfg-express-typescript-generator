import express, { Router } from 'express';
import AuthController from '../controllers/auth.controller';

const authController = new AuthController();
// eslint-disable-next-line new-cap
const router: Router = express.Router();

router.post('/', authController.authUser);

export default router;
