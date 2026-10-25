import { Router } from "express";
import { getBookings, createFlightBooking } from "../controllers/bookingController";
import { validateFlightBooking } from "../validators/bookingValidators";
import { authGuard } from "../middleware/authGuard";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", getBookings);

router.post(
  "/flights",
  authGuard,
  validateRequest(validateFlightBooking),
  createFlightBooking
);

export default router;
