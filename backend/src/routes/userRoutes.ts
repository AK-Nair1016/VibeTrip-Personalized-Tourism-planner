import { Router } from "express";

import {
    getUserProfile,
    updateProfile 
} from "../controllers/userController";

import { authGuard } from "../middleware/authGuard";
import { validateRequest } from "../middleware/validateRequest";

import {validateUpdateProfile} from "../validators/userValidator"

const router = Router();

router.get(
    "/me",
    authGuard,
    getUserProfile
);
router.put(
  "/update/me",
  authGuard,
  validateRequest(validateUpdateProfile),
  updateProfile
);


export default router;