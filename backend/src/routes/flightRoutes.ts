import { Router } from "express";
import { getFlightOffer, searchFlights } from "../controllers/flightController";
import {
  validateFlightSearch,
  validateOfferId,
  validateOfferQuery,
} from "../validators/flightValidators";
import { authGuard } from "../middleware/authGuard";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Public: anyone can search. Validates req.query, not req.body.
router.get("/search", validateRequest(validateFlightSearch, "query"), searchFlights);

// Logged-in users only. This must stay BELOW "/search": Express checks routes
// top to bottom, and "/:offerId" would otherwise swallow the word "search".
router.get(
  "/:offerId",
  authGuard,
  validateRequest(validateOfferId, "params"),
  validateRequest(validateOfferQuery, "query"),
  getFlightOffer
);

export default router;
