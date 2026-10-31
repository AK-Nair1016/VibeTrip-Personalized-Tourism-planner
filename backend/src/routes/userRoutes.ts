import { Router } from "express";

import {
    getUserProfile,
    updateProfile,
    getWishlist,
    addToWishlist,
    removeFromWishlist
} from "../controllers/userController";

import { authGuard } from "../middleware/authGuard";
import { validateRequest } from "../middleware/validateRequest";

import {
    validateUpdateProfile,
    validateWishlistAdd,
    validateWishlistHotelId
} from "../validators/userValidator"

const router = Router();

router.get(
    "/me",
    authGuard,
    getUserProfile
);
router.put(
  "/me",
  authGuard,
  validateRequest(validateUpdateProfile),
  updateProfile
);

router.get("/me/wishlist", authGuard, getWishlist);

router.post(
  "/me/wishlist",
  authGuard,
  validateRequest(validateWishlistAdd),
  addToWishlist
);

router.delete(
  "/me/wishlist/:hotelId",
  authGuard,
  validateRequest(validateWishlistHotelId, "params"),
  removeFromWishlist
);

export default router;