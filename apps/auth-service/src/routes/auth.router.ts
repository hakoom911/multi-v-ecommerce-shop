import express, { Router } from 'express';
import { userForgotPassword, userLogin, userRegistration, userResetPassword, verifyUser, verifyUserForgotPassword } from '../controllers/auth.controller';

const router: Router = express.Router();

router.post("/user-registration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/user-login", userLogin);
router.post("/user-forgot-password", userForgotPassword);
router.post("/user-reset-password", userResetPassword);
router.post("/verify-user-forgot-password", verifyUserForgotPassword);

export default router;