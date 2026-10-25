// Booking checkout (see docs/ARCHITECTURE.md, section 3). F5 covers only the
// first half: price the offer, lock the rate, save a draft, create the Stripe hold.
// The webhook (F6) does the Duffel order and the capture.
import type { CurrencyCode, FlightSlice, Money } from "@vibetrip/shared-types";
import { AppError } from "../utils/AppError";
import { getOfferForCheckout, type DuffelOrderPassenger } from "./duffelFlightService";
import { Booking } from "../models/Booking";
import { createFlightPaymentIntent } from "./stripeService";

// One traveller, as the client sends them. Duffel's pas_ ids are NOT here:
// the server pairs travellers to ids by position (decision made 24 Oct).
export interface PassengerInput {
  title: string; // mr, ms, mrs, miss, dr
  givenName: string;
  familyName: string;
  bornOn: string; // YYYY-MM-DD
  gender: string; // m or f
  email: string;
  phoneNumber: string; // +919999999999
}

export interface CreateFlightBookingData {
  userId: string;
  offerId: string;
  currency: CurrencyCode;
  passengers: PassengerInput[];
}

// What we save on the Booking at checkout. F6 reads it back to create the Duffel
// order, then replaces it with the confirmed details.
export interface FlightDraftSnapshot {
  offerId: string;
  airline: string;
  slices: FlightSlice[];
  price: Money; // what the traveller was shown, in their currency
  expiresAt: string;
  passengers: DuffelOrderPassenger[]; // each one already holds its pas_ id
}

export const createFlightBooking = async (data: CreateFlightBookingData) => {
  const { userId, offerId, currency, passengers } = data;

  // 1. Re-fetch and price the offer. This throws 409 FARE_EXPIRED if the fare is gone.
  //    The price comes from here, never from the client.
  const { offer, conversion } = await getOfferForCheckout(offerId, currency);

  // 2. The offer fixes how many travellers it covers, and we pair them by position
  if (passengers.length !== offer.passengers.length) {
    throw new AppError(
      "PASSENGER_MISMATCH",
      `This fare is for ${offer.passengers.length} passenger(s), but ${passengers.length} were sent`,
      422
    );
  }

  // 3. Build the draft snapshot: pair each traveller with the pas_ id at the same position.
  //    Fields are copied one by one (no spread), so anything extra the client sent is not saved.
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

  // 4. Save the booking first: Stripe needs its id, and the F6 webhook finds it again
  //    through that id. The rate is locked here, so refunds can use the same rate later.
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
    // 5. Hold the money on the card (not taken yet: the webhook captures it after Duffel confirms)
    const payment = await createFlightPaymentIntent({
      amount: conversion.amount,
      currency: conversion.currency,
      bookingId,
      userId,
    });

    // 6. Remember which PaymentIntent belongs to this booking
    booking.stripePaymentIntentId = payment.paymentIntentId;
    await booking.save();

    // 7. The client needs the secret to confirm the card with Stripe Elements
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
