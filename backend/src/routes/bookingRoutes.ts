import { Router } from "express";
import {
  getBookings,
  getBookingById,
  createFlightBooking,
} from "../controllers/bookingController";
import { validateFlightBooking, validateBookingId } from "../validators/bookingValidators";
import { authGuard } from "../middleware/authGuard";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", authGuard, getBookings);

router.get(
  "/:id",
  authGuard,
  validateRequest(validateBookingId, "params"),
  getBookingById
);

router.post(
  "/flights",
  authGuard,
  validateRequest(validateFlightBooking),
  createFlightBooking
);

export default router;
