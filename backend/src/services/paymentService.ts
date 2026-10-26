import type Stripe from "stripe";
import { Booking } from "../models/Booking";
import type { FlightDraftSnapshot } from "./bookingService";
import { createDuffelOrder, type DuffelOrderResult } from "./duffelFlightService";
import { cancelPaymentIntent, capturePaymentIntent } from "./stripeService";

// Stripe retries events and can send one twice, so this must be safe to run twice.
// Errors are logged, not thrown: a 500 would make Stripe retry an order that already ran.
export const handlePaymentAuthorized = async (paymentIntentId: string) => {
  // One atomic step: only a booking still waiting for payment moves to "authorized".
  // A duplicate or concurrent event finds nothing and stops here.
  const booking = await Booking.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId, status: "pending_payment" },
    { status: "authorized" },
    { new: true }
  );
  if (!booking) {
    console.error(`Webhook: no pending booking for ${paymentIntentId}, nothing to do`);
    return;
  }

  const snapshot = booking.snapshot as FlightDraftSnapshot;

  let order: DuffelOrderResult;
  try {
    order = await createDuffelOrder({
      offerId: snapshot.offerId,
      providerAmount: booking.providerAmount,
      providerCurrency: booking.providerCurrency,
      passengers: snapshot.passengers,
    });
  } catch (error) {
    console.error(`Duffel order failed for booking ${booking.id}`, error);
    try {
      await cancelPaymentIntent(paymentIntentId);
    } catch (cancelError) {
      // Stripe expires an unused hold by itself, but we want to know about it
      console.error(`Could not release the hold ${paymentIntentId}`, cancelError);
    }
    booking.status = "failed";
    await booking.save();
    return;
  }

  // Save the order id before taking the money, so a failed capture can be fixed by hand
  booking.providerBookingId = order.providerBookingId;
  booking.bookingReference = order.bookingReference;
  await booking.save();

  try {
    await capturePaymentIntent(paymentIntentId);
  } catch (error) {
    // A real order exists but the money is not taken: the booking stays "authorized" for a manual fix
    console.error(
      `URGENT: Duffel order ${order.providerBookingId} exists but capture failed for booking ${booking.id}`,
      error
    );
    return;
  }

  booking.status = "confirmed";
  booking.snapshot = {
    ...snapshot,
    providerBookingId: order.providerBookingId,
    bookingReference: order.bookingReference,
  };
  await booking.save();
};

export const handleWebhookEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "payment_intent.amount_capturable_updated": {
      const paymentIntent = event.data.object;
      await handlePaymentAuthorized(paymentIntent.id);
      return;
    }
    default:
      // A declined card is not handled on purpose: the traveller can retry on the same
      // PaymentIntent, so marking the booking failed would block a later success.
      // Other types are not errors either: a 2xx stops Stripe's retries.
      return;
  }
};
