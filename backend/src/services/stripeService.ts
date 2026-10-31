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

// Used when the same checkout is asked for again: the client needs the secret of the PaymentIntent
// that already exists, not a new one
export const getPaymentIntentClientSecret = async (paymentIntentId: string): Promise<string> => {
  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error retrieving ${paymentIntentId}: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not load the payment", 502);
  }

  if (!intent.client_secret) {
    throw new AppError("PROVIDER_ERROR", "The payment provider did not return a payment secret", 502);
  }

  return intent.client_secret;
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

interface StripeCustomerData {
  userId: string;
  email: string;
  name: string;
}

// One Stripe customer per user, so a saved card has an owner
export const createStripeCustomer = async (data: StripeCustomerData): Promise<string> => {
  const { userId, email, name } = data;

  try {
    const customer = await stripe.customers.create(
      { email, name, metadata: { userId } },
      // A retried call cannot create a second customer for the same user
      { idempotencyKey: `customer-${userId}` }
    );
    return customer.id;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error creating customer for user ${userId}: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not create your account", 502);
  }
};

interface CardSetupData {
  customerId: string;
  userId: string;
}

// Saves a card without charging it. The card is used later, off session, only for a late cancel fee.
export const createCardSetupIntent = async (data: CardSetupData) => {
  const { customerId, userId } = data;

  let intent: Stripe.SetupIntent;
  try {
    intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
      metadata: { userId },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error creating SetupIntent: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not start the card setup", 502);
  }

  if (!intent.client_secret) {
    throw new AppError("PROVIDER_ERROR", "The payment provider did not return a setup secret", 502);
  }

  return { setupIntentId: intent.id, clientSecret: intent.client_secret };
};

export const getSetupIntent = async (setupIntentId: string): Promise<Stripe.SetupIntent> => {
  try {
    return await stripe.setupIntents.retrieve(setupIntentId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error retrieving ${setupIntentId}: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not load the saved card", 502);
  }
};

interface SavedCardCharge {
  customerId: string;
  paymentMethodId: string;
  amount: number;
  currency: CurrencyCode;
  bookingId: string;
}

// Charges the saved card with the guest absent (off_session), for a late cancel fee.
export const chargeSavedCard = async (data: SavedCardCharge): Promise<Stripe.PaymentIntent> => {
  const { customerId, paymentMethodId, amount, currency, bookingId } = data;

  try {
    return await stripe.paymentIntents.create(
      {
        amount: toMinorUnits(amount, currency),
        currency: currency.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: { bookingId },
      },
      // A retried call cannot charge the same booking's fee twice
      { idempotencyKey: `late-fee-${bookingId}` }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error charging the late fee for booking ${bookingId}: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not charge the saved card", 502);
  }
};

interface RefundData {
  paymentIntentId: string;
  amount: number;
  currency: CurrencyCode;
  bookingId: string;
}

// Returns money that was already captured. amount is in the booking currency, same as the charge.
export const refundPaymentIntent = async (data: RefundData): Promise<Stripe.Refund> => {
  const { paymentIntentId, amount, currency, bookingId } = data;

  try {
    return await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: toMinorUnits(amount, currency),
      },
      // A retried call cannot refund the same booking twice
      { idempotencyKey: `refund-${bookingId}` }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Stripe error refunding ${paymentIntentId}: ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The payment provider could not refund the payment", 502);
  }
};
