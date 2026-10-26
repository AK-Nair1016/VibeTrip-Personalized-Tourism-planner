import type { CurrencyCode, FlightSlice, Money } from "@vibetrip/shared-types";
import { AppError } from "../utils/AppError";
import {
  getOfferForCheckout,
  getDuffelOrderStatus,
  createDuffelCancellationQuote,
  confirmDuffelCancellation,
  type DuffelOrderPassenger,
  type FlightLiveStatus,
} from "./duffelFlightService";
import { Booking } from "../models/Booking";
import { roundForCurrency } from "./fxService";
import { createFlightPaymentIntent, refundPaymentIntent } from "./stripeService";

// One traveller, as the client sends them. Duffel's pas_ ids are NOT here:
// the server pairs travellers to ids by position (decision made 24 Oct).
export interface PassengerInput {
  title: string;
  givenName: string;
  familyName: string;
  bornOn: string;
  gender: string;
  email: string;
  phoneNumber: string;
}

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
  passengers: DuffelOrderPassenger[];
}

export const createFlightBooking = async (data: CreateFlightBookingData) => {
  const { userId, offerId, currency, passengers } = data;

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
  const snapshotPassengers: DuffelOrderPassenger[] = [];
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
  const booking = await Booking.create({
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
  });

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
