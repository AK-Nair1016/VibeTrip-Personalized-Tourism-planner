import { Router } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  googleLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/authController";
import passport from "../config/passport"
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
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleLogin
);


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