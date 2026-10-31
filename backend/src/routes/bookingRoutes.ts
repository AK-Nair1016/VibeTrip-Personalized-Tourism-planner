import { Router } from "express";
import {
  getBookings,
  getBookingById,
  getBookingStatus,
  createCancellationQuote,
  cancelBooking,
  createFlightBooking,
  createHotelBooking,
  createHotelCardSetup,
} from "../controllers/bookingController";
import {
  validateFlightBooking,
  validateHotelBooking,
  validateBookingId,
} from "../validators/bookingValidators";
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

router.post(
  "/hotels/card-setup",
  authGuard,
  createHotelCardSetup
);

router.post(
  "/hotels",
  authGuard,
  validateRequest(validateHotelBooking),
  createHotelBooking
);

export default router;
