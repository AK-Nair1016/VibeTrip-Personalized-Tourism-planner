import crypto from "crypto";
import type {
  CurrencyCode,
  FlightSlice,
  Money,
  OrderPassenger,
  PassengerInput,
} from "@vibetrip/shared-types";
import { AppError } from "../utils/AppError";
import {
  getOfferForCheckout,
  getDuffelOrderStatus,
  createDuffelCancellationQuote,
  confirmDuffelCancellation,
  type FlightLiveStatus,
} from "./duffelFlightService";
import { Booking } from "../models/Booking";
import { roundForCurrency } from "./fxService";
import {
  cancelPaymentIntent,
  createFlightPaymentIntent,
  getPaymentIntentClientSecret,
  refundPaymentIntent,
} from "./stripeService";

export interface CreateFlightBookingData {
  userId: string;
  offerId: string;
  currency: CurrencyCode;
  passengers: PassengerInput[];
}

export interface FlightDraftSnapshot {
  offerId: string;
  airline: string;
  slices: FlightSlice[];
  price: Money;
  expiresAt: string;
  passengers: OrderPassenger[];
}

interface CheckoutResult {
  bookingId: string;
  clientSecret: string;
  totalAmount: number;
  currency: string;
}

// A fingerprint of what the client asked for. Same fingerprint means the same request again
// (a double click or a retry); a different one means the traveller changed something.
const hashFlightRequest = (
  offerId: string,
  currency: string,
  passengers: PassengerInput[]
): string => {
  // Fields are listed one by one, so the order of keys in the client's JSON cannot change the hash.
  // The order of passengers does count, because passengers are paired to the offer by position.
  const rows: string[][] = [];
  for (const passenger of passengers) {
    rows.push([
      passenger.title,
      passenger.givenName,
      passenger.familyName,
      passenger.bornOn,
      passenger.gender,
      passenger.email,
      passenger.phoneNumber,
    ]);
  }

  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ offerId, currency, rows }))
    .digest("hex");
};

// 11000 is MongoDB's "duplicate key" error: a unique index refused the insert
const isDuplicateKeyError = (error: unknown): boolean => {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
};

type ExistingBooking = InstanceType<typeof Booking>;

// Rebuilds the checkout answer for a booking that already exists
const toCheckoutResult = async (booking: ExistingBooking): Promise<CheckoutResult> => {
  const bookingId = booking._id.toString();

  // The first request has saved the booking but is still talking to Stripe. We must not ask Stripe
  // for the same PaymentIntent now: two calls with one idempotency key at the same moment make
  // Stripe refuse one of them, and the first request would then wrongly mark the booking failed.
  // The client retries in a moment and finds the saved PaymentIntent.
  if (!booking.stripePaymentIntentId) {
    throw new AppError(
      "CHECKOUT_IN_PROGRESS",
      "Another checkout for this fare is being created, try again in a moment",
      409
    );
  }

  const clientSecret = await getPaymentIntentClientSecret(booking.stripePaymentIntentId);

  return {
    bookingId,
    clientSecret,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
  };
};

// Gives up an unpaid booking so the traveller can check out again with changed details.
const releasePendingBooking = async (booking: ExistingBooking) => {
  // One atomic step, like the webhook's: only a booking still waiting for payment is released.
  // If the webhook just moved it to "authorized", the traveller has paid, so we must not cancel it.
  // findOneAndUpdate skips the save hook, so the fields the hook would set are written here.
  const released = await Booking.findOneAndUpdate(
    { _id: booking._id, status: "pending_payment" },
    { status: "failed", isLive: false },
    { new: true }
  );

  if (!released) {
    // Nothing matched because the status is no longer pending. If another request just released
    // it (a double click after the window), there is nothing left to do here: carry on.
    const current = await Booking.findById(booking._id).select("status").lean();
    if (current && (current.status === "failed" || current.status === "cancelled")) {
      return;
    }

    throw new AppError(
      "BOOKING_EXISTS",
      "A payment for this fare is already being processed",
      409
    );
  }

  // Free the card hold. If this fails Stripe lets the unused hold expire by itself.
  if (released.stripePaymentIntentId) {
    try {
      await cancelPaymentIntent(released.stripePaymentIntentId);
    } catch (error) {
      console.error(`Could not release the hold for replaced booking ${released.id}`, error);
    }
  }
};

interface ExistingCheckoutLookup {
  userId: string;
  dedupeKey: string;
  requestHash: string;
}

// How long a traveller has to pay. After this an unpaid booking is let go, so the fare is free again.
const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

// Looks for a booking that already answers this checkout. Returns its answer, returns null
// when the caller should go on and create a new booking, or throws when the request is refused.
const findExistingCheckout = async (
  lookup: ExistingCheckoutLookup
): Promise<CheckoutResult | null> => {
  const { userId, dedupeKey, requestHash } = lookup;

  // Is this user already buying this fare?
  const live = await Booking.findOne({ userId, dedupeKey, isLive: true });

  if (!live) {
    return null;
  }

  // Paid or confirmed: a second copy must never be created
  if (live.status !== "pending_payment") {
    throw new AppError("BOOKING_EXISTS", "You already have a booking for this fare", 409);
  }

  // An unpaid booking is good until the payment window ends or Duffel's fare expires, whichever
  // is first. Past that, nobody should still be paying on it, so let it go and start afresh.
  // No money has moved on an unpaid booking, so releasing it costs the traveller nothing.
  const snapshot = live.snapshot as FlightDraftSnapshot;
  const windowEnd = live.createdAt.getTime() + PAYMENT_WINDOW_MS;
  const payUntil = Math.min(windowEnd, new Date(snapshot.expiresAt).getTime());

  if (payUntil <= Date.now()) {
    await releasePendingBooking(live);
    return null;
  }

  // Unpaid and identical: hand back the same checkout
  if (live.requestHash === requestHash) {
    return toCheckoutResult(live);
  }

  // Unpaid but different (a corrected name, another currency). Decided 26 Oct: never cancel a
  // checkout the traveller may be paying on right now. They finish it, or wait for the window to end.
  const minutesLeft = Math.max(1, Math.ceil((payUntil - Date.now()) / 60000));
  throw new AppError(
    "CHECKOUT_PENDING",
    `You have an unpaid checkout for this fare. Finish it, or try again in ${minutesLeft} minute(s)`,
    409
  );
};

export const createFlightBooking = async (data: CreateFlightBookingData): Promise<CheckoutResult> => {
  const { userId, offerId, currency, passengers } = data;

  const dedupeKey = `flight:${offerId}`;
  const requestHash = hashFlightRequest(offerId, currency, passengers);

  // Ask the database first: a repeat of an earlier request is answered without calling Duffel
  // (the fare may even have expired since). The unique index below is what makes this race-proof.
  const existing = await findExistingCheckout({
    userId,
    dedupeKey,
    requestHash,
  });
  if (existing) {
    return existing;
  }

  // Re-fetch and price the offer. This throws 409 FARE_EXPIRED if the fare is gone.
  // The price comes from here, never from the client.
  const { offer, conversion } = await getOfferForCheckout(offerId, currency);

  // The offer fixes how many travellers it covers, and we pair them by position
  if (passengers.length !== offer.passengers.length) {
    throw new AppError(
      "PASSENGER_MISMATCH",
      `This fare is for ${offer.passengers.length} passenger(s), but ${passengers.length} were sent`,
      422
    );
  }

  // Fields are copied one by one (no spread), so anything extra the client sent is not saved.
  const snapshotPassengers: OrderPassenger[] = [];
  for (let i = 0; i < passengers.length; i++) {
    const passenger = passengers[i];
    snapshotPassengers.push({
      id: offer.passengers[i].id,
      title: passenger.title,
      gender: passenger.gender,
      givenName: passenger.givenName,
      familyName: passenger.familyName,
      bornOn: passenger.bornOn,
      email: passenger.email,
      phoneNumber: passenger.phoneNumber,
    });
  }

  const snapshot: FlightDraftSnapshot = {
    offerId: offer.offerId,
    airline: offer.airline,
    slices: offer.slices,
    price: offer.price,
    expiresAt: offer.expiresAt,
    passengers: snapshotPassengers,
  };

  // Save the booking first: Stripe needs its id, and the webhook finds it again
  // through that id. The rate is locked here, so refunds can use the same rate later.
  let booking: ExistingBooking;
  try {
    booking = await Booking.create({
      userId,
      type: "flight",
      provider: "duffel",
      status: "pending_payment",
      totalAmount: conversion.amount,
      currency: conversion.currency,
      providerAmount: conversion.providerAmount,
      providerCurrency: conversion.providerCurrency,
      fxRate: conversion.rate,
      fxRateAt: conversion.rateAt,
      snapshot,
      dedupeKey,
      requestHash,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    // A unique index refused the insert: another request for this user and fare got in between
    // our look-up and our insert (a double click, two tabs). Answer with what that request made.
    const winner = await findExistingCheckout({
      userId,
      dedupeKey,
      requestHash,
    });
    if (winner) {
      return winner;
    }

    // The winner finished (failed or cancelled) and freed the slot while we looked: nothing to return
    throw new AppError("CHECKOUT_IN_PROGRESS", "Could not start the checkout, please try again", 409);
  }

  const bookingId = booking._id.toString();

  try {
    const payment = await createFlightPaymentIntent({
      amount: conversion.amount,
      currency: conversion.currency,
      bookingId,
      userId,
    });

    booking.stripePaymentIntentId = payment.paymentIntentId;
    await booking.save();

    return {
      bookingId,
      clientSecret: payment.clientSecret,
      totalAmount: conversion.amount,
      currency: conversion.currency,
    };
  } catch (error) {
    // Do not leave a pending_payment row behind. If even this save fails we only log it,
    // so the caller still sees the original error.
    try {
      booking.status = "failed";
      await booking.save();
    } catch (saveError) {
      console.error(`Could not mark booking ${bookingId} as failed`, saveError);
    }
    throw error;
  }
};

export interface GetUserBookingsData {
  userId: string;
}

export interface GetBookingData {
  userId: string;
  bookingId: string;
}

// Decided 25 Oct: the list hides "failed" and "pending_payment" (abandoned checkouts are noise),
// and it is not paginated.
export const getUserBookings = async (data: GetUserBookingsData) => {
  const { userId } = data;

  // Newest first. The { userId: 1, createdAt: -1 } index serves this query.
  // lean() returns plain objects, which is enough for a read-only list.
  const bookings = await Booking.find({
    userId,
    status: { $in: ["authorized", "confirmed", "cancelled"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return bookings;
};

export const getBookingById = async (data: GetBookingData) => {
  const { userId, bookingId } = data;

  // Query by BOTH ids: another user's booking then looks the same as a missing one,
  // so booking ids cannot be guessed.
  const booking = await Booking.findOne({ _id: bookingId, userId }).lean();

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  // Only a confirmed flight has a Duffel order to ask about.
  let liveStatus: FlightLiveStatus | null = null;

  if (booking.type === "flight" && booking.status === "confirmed" && booking.providerBookingId) {
    try {
      liveStatus = await getDuffelOrderStatus(booking.providerBookingId);
    } catch (error) {
      // Decided 25 Oct: if Duffel is down the user still gets their booking, without live status.
      console.error(`Could not fetch live status for booking ${bookingId}`, error);
    }
  }

  return { ...booking, liveStatus };
};

// What the traveller is told for each status. The app, not the bank statement, is where they
// learn the result, so a failed payment says plainly that nothing was charged.
const STATUS_MESSAGES: Record<string, string> = {
  pending_payment: "Waiting for your payment",
  authorized: "Payment received, we are confirming your booking",
  confirmed: "Your booking is confirmed",
  failed:
    "The booking could not be completed and you were not charged. If your bank shows a pending hold, it releases it within a few days",
  cancelled: "This booking was cancelled",
};

// A light check for the "did my payment work?" page. Unlike getBookingById it never calls Duffel,
// so the frontend can poll it every few seconds, and it also answers for failed and pending bookings
// that the history list hides.
export const getBookingStatus = async (data: GetBookingData) => {
  const { userId, bookingId } = data;

  // Same owner check as getBookingById: someone else's booking looks like a missing one
  const booking = await Booking.findOne({ _id: bookingId, userId })
    .select("status refundStatus")
    .lean();

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  return {
    bookingId,
    status: booking.status,
    message: STATUS_MESSAGES[booking.status as string],
    refundStatus: booking.refundStatus ?? null,
  };
};

// Step 1 of cancelling: ask Duffel what the refund would be and save the quote. Nothing is cancelled yet.
export const createCancellationQuote = async (data: GetBookingData) => {
  const { userId, bookingId } = data;

  // Not lean(): we save the quote on this document below
  const booking = await Booking.findOne({ _id: bookingId, userId });

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  if (booking.type !== "flight" || booking.status !== "confirmed" || !booking.providerBookingId) {
    throw new AppError("NOT_CANCELLABLE", "Only a confirmed flight booking can be cancelled", 409);
  }

  // Ask Duffel if this fare allows cancelling at all. If Duffel is down this throws 502:
  // unlike the detail page, there is no safe answer to guess here.
  const liveStatus = await getDuffelOrderStatus(booking.providerBookingId);

  if (!liveStatus.availableActions.includes("cancel")) {
    throw new AppError("NOT_CANCELLABLE", "This booking can no longer be cancelled", 409);
  }

  const quote = await createDuffelCancellationQuote(booking.providerBookingId);

  // Refund at the rate locked at checkout, never today's rate
  const userRefundAmount = roundForCurrency(quote.refundAmount * booking.fxRate, booking.currency);

  // Saved on the booking so cancelBooking confirms THIS quote and the client cannot name its own
  booking.cancellationQuote = {
    quoteId: quote.quoteId,
    providerRefundAmount: quote.refundAmount,
    providerRefundCurrency: quote.refundCurrency,
    userRefundAmount,
    expiresAt: new Date(quote.expiresAt),
  };
  await booking.save();

  return {
    bookingId,
    refundAmount: userRefundAmount,
    currency: booking.currency,
    expiresAt: quote.expiresAt,
  };
};

// Step 2: confirm the saved quote with Duffel, then refund through Stripe.
export const cancelBooking = async (data: GetBookingData) => {
  const { userId, bookingId } = data;

  const booking = await Booking.findOne({ _id: bookingId, userId });

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  // A second call after a cancel lands here too, because the status is no longer "confirmed"
  if (booking.type !== "flight" || booking.status !== "confirmed" || !booking.stripePaymentIntentId) {
    throw new AppError("NOT_CANCELLABLE", "Only a confirmed flight booking can be cancelled", 409);
  }

  const quote = booking.cancellationQuote;

  if (!quote || !quote.quoteId || typeof quote.userRefundAmount !== "number" || !quote.expiresAt) {
    throw new AppError("QUOTE_REQUIRED", "Ask for a cancellation quote first", 409);
  }

  if (quote.expiresAt.getTime() <= Date.now()) {
    throw new AppError("QUOTE_REQUIRED", "The cancellation quote expired, ask for a new one", 409);
  }

  // If Duffel refuses, this throws and the booking stays "confirmed" with nothing refunded
  await confirmDuffelCancellation(quote.quoteId);

  // The flight is cancelled now. Save that BEFORE touching Stripe, so a crash or a Stripe
  // failure below still leaves a record of what is owed.
  const refundAmount = quote.userRefundAmount;
  const currency = booking.currency as CurrencyCode;

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.refundAmount = refundAmount;
  booking.refundCurrency = currency;
  booking.refundStatus = "pending";
  await booking.save();

  // A non-refundable fare quotes 0, and Stripe rejects a 0 refund, so there is nothing to send
  if (refundAmount === 0) {
    booking.refundStatus = "succeeded";
    await booking.save();
  } else {
    try {
      await refundPaymentIntent({
        paymentIntentId: booking.stripePaymentIntentId,
        amount: refundAmount,
        currency,
        bookingId,
      });
      booking.refundStatus = "succeeded";
    } catch (error) {
      // Decided 26 Oct: the cancellation stands, the failed refund is visible in the data
      // (refundStatus "failed") and in this log, to be refunded by hand or retried later.
      console.error(`Refund failed for booking ${bookingId}: ${refundAmount} ${currency}`, error);
      booking.refundStatus = "failed";
    }
    await booking.save();
  }

  return {
    bookingId,
    status: booking.status,
    refundAmount,
    currency,
    refundStatus: booking.refundStatus,
  };
};
