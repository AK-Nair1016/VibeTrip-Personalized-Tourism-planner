import type { Request, Response } from "express";
import { constructWebhookEvent } from "../services/stripeService";
import { handleWebhookEvent as handleWebhookEventService } from "../services/paymentService";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

// POST /api/payments/webhook  (called by Stripe, not by a logged-in user)
export const stripeWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const signature = req.header("stripe-signature");
    if (!signature) {
      throw new AppError("WEBHOOK_SIGNATURE_INVALID", "Missing webhook signature", 400);
    }

    // index.ts mounts express.raw on this path, so req.body is the untouched Buffer
    const event = constructWebhookEvent(req.body as Buffer, signature);
    await handleWebhookEventService(event);

    // A quick 2xx tells Stripe we got it, so it stops retrying
    res.status(200).json({ received: true });
  }
);
