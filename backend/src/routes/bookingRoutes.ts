import { Router } from "express";
import {
  getBookings,
  getBookingById,
  getBookingStatus,
  createCancellationQuote,
  cancelBooking,
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

router.get(
  "/:id/status",
  authGuard,
  validateRequest(validateBookingId, "params"),
  getBookingStatus
);

router.post(
  "/:id/cancellation-quote",
  authGuard,
  validateRequest(validateBookingId, "params"),
  createCancellationQuote
);

router.post(
  "/:id/cancel",
  authGuard,
  validateRequest(validateBookingId, "params"),
  cancelBooking
);

router.post(
  "/flights",
  authGuard,
  validateRequest(validateFlightBooking),
  createFlightBooking
);

export default router;
