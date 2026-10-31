import { Router } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/authController";
import { validateSignup, validateLogin, validateForgetPassword, validateResetPassword} from "../validators/authValidators";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post(
  "/signup",
  validateRequest(validateSignup),
  signup
);

router.post(
  "/login",
  validateRequest(validateLogin),
  login
);

// Google login is Phase 2 (Aman, 2026-10-31): /google and /google/callback are not mounted.
// To bring it back, re-add both routes and `app.use(passport.initialize())` in index.ts.
// Do not ship it before the account-linking hole is closed (Project-Status, review log).

router.post("/refresh",refresh);

router.post("/logout", logout);
router.post(
  "/forgot-password",
  validateRequest(validateForgetPassword),
  forgotPassword
);

router.post(
  "/reset-password/:token",
  validateRequest(validateResetPassword),
  resetPassword
);

router.get(
  "/verify-email/:token",
  verifyEmail
);

export default router;