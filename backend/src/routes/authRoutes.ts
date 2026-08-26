import { Router } from "express";
import { signup, login } from "../controllers/authController";
import { validateSignup, validateLogin } from "../validators/authValidators";
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

export default router;