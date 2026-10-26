import { Router } from "express";
import { stripeWebhook } from "../controllers/paymentController";

const router = Router();

// No authGuard and no validateRequest: Stripe is not a logged-in user and does not send our
// JSON shape. The Stripe signature check inside the controller is what proves the caller.
router.post(
  "/webhook",
  stripeWebhook
);

export default router;
