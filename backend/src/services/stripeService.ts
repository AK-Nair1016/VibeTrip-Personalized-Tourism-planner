import type { CurrencyCode } from "@vibetrip/shared-types";
import Stripe from "stripe";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { toMinorUnits } from "./fxService";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

interface PaymentIntentData {
  amount: number;
  currency: CurrencyCode;
  bookingId: string;
  userId: string;
}

export const createFlightPaymentIntent = async (data: PaymentIntentData) => {
  const { amount, currency, bookingId, userId } = data;

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create(
      {
        amount: toMinorUnits(amount, currency),
        currency: currency.toLowerCase(),
        // Hold the money now, take it only after Duffel confirms the flight
        capture_method: "manual",
        metadata: { bookingId, userId },
        automatic_payment_methods: { enabled: true },
      },
      // A retried call cannot create a second PaymentIntent for the same booking
      { idempotencyKey: `booking-${bookingId}` }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error creating PaymentIntent: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not start the payment", 502);
  }

  // Stripe's types allow null here, but a new PaymentIntent always has one
  if (!intent.client_secret) {
    throw new AppError("PROVIDER_ERROR", "The payment provider did not return a payment secret", 502);
  }

  return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
};

// Checks locally (no network) that the event really came from Stripe
export const constructWebhookEvent = (rawBody: Buffer, signature: string): Stripe.Event => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe webhook signature check failed: ${reason}`);
    throw new AppError("WEBHOOK_SIGNATURE_INVALID", "Invalid webhook signature", 400);
  }

  return event;
};

// Takes the held money. Call it only after the Duffel order succeeded.
export const capturePaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  try {
    return await stripe.paymentIntents.capture(paymentIntentId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error capturing ${paymentIntentId}: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not take the payment", 502);
  }
};

// Releases the hold when the Duffel order failed, so the traveller is never charged
export const cancelPaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  try {
    return await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error cancelling ${paymentIntentId}: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not release the payment hold", 502);
  }
};
