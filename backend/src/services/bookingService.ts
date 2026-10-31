import crypto from "crypto";
import type {
  CurrencyCode,
  FlightSlice,
  Money,
  OrderPassenger,
  PassengerInput,
  HotelBookingSnapshot,
} from "@vibetrip/shared-types";
import { AppError } from "../utils/AppError";
import { isDuplicateKeyError } from "../utils/dbErrors";
import { countNights, freeCancelUntil } from "../utils/stayDates";
import {
  getOfferForCheckout,
  getDuffelOrderStatus,
  createDuffelCancellationQuote,
  confirmDuffelCancellation,
  type FlightLiveStatus,
} from "./duffelFlightService";
import { Booking } from "../models/Booking";
import { Hotel } from "../models/Hotel";
import { Room } from "../models/Room";
import { User } from "../models/User";
import { HOTEL_LIMITS, PAYMENT_WINDOW_MS, SEEDED_FREE_CANCEL_HOURS } from "../config/constants";
import { getRoomsLeft } from "./availabilityService";
import { convert, roundForCurrency } from "./fxService";
import { guestsPerRoom } from "./hotelService";
import {
  cancelPaymentIntent,
  chargeSavedCard,
  createCardSetupIntent,
  createFlightPaymentIntent,
  createStripeCustomer,
  getPaymentIntentClientSecret,
  getSetupIntent,
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

// The only fields a booking response may return (GET /bookings and GET /bookings/:id). A list we
// choose is safer than "everything except the secrets": a field added to the model later stays
// private until someone adds it here.
const BOOKING_PUBLIC_FIELDS = [
  "type",
  "status",
  "bookingReference",
  "totalAmount",
  "currency",
  "snapshot",
  "cancelledAt",
  "cancellationFee",
  "cancellationFeeStatus",
  "refundAmount",
  "refundCurrency",
  "refundStatus",
  "createdAt",
  "updatedAt",
].join(" ");

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
    .select(BOOKING_PUBLIC_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  return bookings;
};

// The detail adds providerBookingId, read only for the live status call below and removed
// before replying.
const BOOKING_DETAIL_FIELDS = `${BOOKING_PUBLIC_FIELDS} providerBookingId`;

export const getBookingById = async (data: GetBookingData) => {
  const { userId, bookingId } = data;

  // Query by BOTH ids: another user's booking then looks the same as a missing one,
  // so booking ids cannot be guessed. select() with a list returns only those fields (and _id).
  const booking = await Booking.findOne({ _id: bookingId, userId })
    .select(BOOKING_DETAIL_FIELDS)
    .lean();

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

  // The Duffel order id is ours to keep, the traveller uses bookingReference
  const { providerBookingId, ...publicFields } = booking;

  return { ...publicFields, liveStatus };
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

  if (booking.type === "hotel") {
    throw new AppError("NOT_CANCELLABLE", "Hotel bookings are cancelled directly, no quote is needed", 409);
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

// No refund: nothing was paid at booking. A late fee is charged to the card saved at booking.
const cancelHotelBooking = async (booking: ExistingBooking) => {
  if (booking.status !== "confirmed") {
    throw new AppError("NOT_CANCELLABLE", "Only a confirmed booking can be cancelled", 409);
  }

  const snapshot = booking.snapshot as HotelBookingSnapshot;

  // Check-in counts from 00:00 UTC of the check-in day
  if (Date.now() >= Date.parse(snapshot.checkIn)) {
    throw new AppError("STAY_STARTED", "This stay has already started and cannot be cancelled online", 409);
  }

  const isLate = Date.now() >= Date.parse(snapshot.freeCancelUntil);
  const cancellationFee = isLate ? snapshot.lateCancelFee.amount : 0;

  // Atomic, so a double click cancels once. It skips the save hook, so isLive is set here.
  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, userId: booking.userId, status: "confirmed" },
    {
      status: "cancelled",
      isLive: false,
      cancelledAt: new Date(),
      cancellationFee,
      ...(cancellationFee > 0 ? { cancellationFeeStatus: "pending" } : {}),
    },
    { new: true }
  );

  if (!cancelled) {
    throw new AppError("NOT_CANCELLABLE", "Only a confirmed booking can be cancelled", 409);
  }

  const bookingId = booking._id.toString();
  const currency = snapshot.lateCancelFee.currency;
  let cancellationFeeStatus: "succeeded" | "failed" | null = null;

  if (cancellationFee > 0) {
    cancellationFeeStatus = "failed";

    // The cancellation stands even if the card cannot be charged; the failed status is the record
    try {
      if (booking.stripeCustomerId && booking.stripePaymentMethodId) {
        const payment = await chargeSavedCard({
          customerId: booking.stripeCustomerId,
          paymentMethodId: booking.stripePaymentMethodId,
          amount: cancellationFee,
          currency: booking.currency as CurrencyCode,
          bookingId,
        });

        if (payment.status === "succeeded") {
          cancellationFeeStatus = "succeeded";
        }
      }
    } catch (error) {
      console.error(`Late fee charge failed for booking ${bookingId}: ${cancellationFee} ${currency}`, error);
    }

    // The card may already be charged, so a failed save is logged, not thrown
    try {
      await Booking.updateOne({ _id: booking._id }, { cancellationFeeStatus });
    } catch (error) {
      console.error(`Could not save fee status "${cancellationFeeStatus}" for booking ${bookingId}`, error);
    }
  }

  return { bookingId, status: "cancelled", cancellationFee, currency, cancellationFeeStatus };
};

// Hotels cancel directly. Flights: confirm the saved quote with Duffel, then refund through Stripe.
export const cancelBooking = async (data: GetBookingData) => {
  const { userId, bookingId } = data;

  // The saved card ids are hidden by default; a hotel cancel needs them for the late fee
  const booking = await Booking.findOne({ _id: bookingId, userId }).select(
    "+stripeCustomerId +stripePaymentMethodId"
  );

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  if (booking.type === "hotel") {
    return cancelHotelBooking(booking);
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

  // Keep a plain copy of the quote, so it can be put back if Duffel refuses
  const quoteCopy = {
    quoteId: quote.quoteId,
    providerRefundAmount: quote.providerRefundAmount,
    providerRefundCurrency: quote.providerRefundCurrency,
    userRefundAmount: quote.userRefundAmount,
    expiresAt: quote.expiresAt,
  };

  // Claim the cancel before calling Duffel. One atomic step: only a still-confirmed booking that
  // holds this exact quote matches, and the update removes the quote. Two requests at the same
  // moment both pass the checks above, but only one gets a document back here. The loser stops,
  // so Duffel and Stripe are called once. The status stays "confirmed" until Duffel agrees, so a
  // crash right after the claim leaves a booking that is still cancellable (ask for a new quote).
  const claimed = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      userId,
      status: "confirmed",
      "cancellationQuote.quoteId": quote.quoteId,
    },
    { $unset: { cancellationQuote: "" } }
  );

  if (!claimed) {
    throw new AppError("NOT_CANCELLABLE", "This booking is already being cancelled or is cancelled", 409);
  }

  try {
    await confirmDuffelCancellation(quote.quoteId);
  } catch (error) {
    // Duffel refused: nothing was cancelled or refunded. Put the quote back so the traveller can
    // retry while it is valid, as before. If this restore fails they just ask for a new quote.
    try {
      await Booking.updateOne({ _id: booking._id, status: "confirmed" }, { cancellationQuote: quoteCopy });
    } catch (restoreError) {
      console.error(`Could not restore the cancellation quote for booking ${bookingId}`, restoreError);
    }
    throw error;
  }

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

export interface CreateHotelBookingData {
  userId: string;
  hotelId: string;
  roomId: string;
  setupIntentId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  leadGuest: { givenName: string; familyName: string };
  email: string;
  phoneNumber: string;
  currency: CurrencyCode;
}

export interface HotelCardSetupData {
  userId: string;
}

// Step 1 of a hotel booking: save a card without charging it. Reuses the user's Stripe customer.
export const createHotelCardSetup = async (data: HotelCardSetupData) => {
  const { userId } = data;

  const user = await User.findById(userId).select("+stripeCustomerId email name");
  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    customerId = await createStripeCustomer({ userId, email: user.email, name: user.name });
    // updateOne, so no save hooks or validators run on the user
    await User.updateOne({ _id: userId }, { stripeCustomerId: customerId });
  }

  const setup = await createCardSetupIntent({ customerId, userId });

  return { setupIntentId: setup.setupIntentId, clientSecret: setup.clientSecret };
};

interface HotelBookingResult {
  bookingId: string;
  bookingReference: string;
  status: string;
  totalAmount: number;
  currency: string;
}

// Hotels are paid at the property. A card saved with a SetupIntent guarantees the booking (nothing is
// charged now), so the booking is confirmed straight away.
export const createHotelBooking = async (data: CreateHotelBookingData): Promise<HotelBookingResult> => {
  const { userId, hotelId, roomId, setupIntentId, checkIn, checkOut, leadGuest, email, phoneNumber, currency } =
    data;

  // The validator also accepts "2" as text; the availability sum needs real numbers
  const rooms = Number(data.rooms);
  const guests = Number(data.guests);

  const nights = countNights(checkIn, checkOut);
  const dedupeKey = `hotel:room:${roomId}:${checkIn}:${checkOut}`;

  const existing = await Booking.findOne({ userId, dedupeKey, isLive: true });
  if (existing) {
    throw new AppError("BOOKING_EXISTS", "You already have a booking for this room and these dates", 409);
  }

  // Stays that already ended do not count towards the cap
  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = await Booking.countDocuments({
    userId,
    type: "hotel",
    isLive: true,
    "snapshot.checkOut": { $gt: today },
  });
  if (upcomingCount >= HOTEL_LIMITS.maxLiveBookings) {
    throw new AppError(
      "TOO_MANY_BOOKINGS",
      `You can hold at most ${HOTEL_LIMITS.maxLiveBookings} upcoming hotel bookings, cancel one first`,
      409
    );
  }

  const hotel = await Hotel.findById(hotelId).lean();
  if (!hotel) {
    throw new AppError("HOTEL_NOT_FOUND", "Hotel not found", 404);
  }

  // Matching hotelId stops pairing one hotel with a room of another
  const room = await Room.findOne({ _id: roomId, hotelId }).lean();
  if (!room) {
    throw new AppError("ROOM_NOT_FOUND", "Room not found", 404);
  }

  if (guestsPerRoom(guests, rooms) > room.maxGuests) {
    throw new AppError("TOO_MANY_GUESTS", "This room cannot hold that many guests", 422);
  }

  const capacity = [{ roomId, totalRooms: room.totalRooms }];

  const roomsLeftBefore = await getRoomsLeft(capacity, checkIn, checkOut);
  if ((roomsLeftBefore.get(roomId) ?? 0) < rooms) {
    throw new AppError("NO_AVAILABILITY", "Not enough rooms are free for these dates", 409);
  }

  const user = await User.findById(userId).select("+stripeCustomerId");
  const intent = await getSetupIntent(setupIntentId);

  const customerRef = intent.customer;
  const intentCustomerId = typeof customerRef === "string" ? customerRef : customerRef?.id;
  const methodRef = intent.payment_method;
  const paymentMethodId = typeof methodRef === "string" ? methodRef : methodRef?.id;

  // The customer match stops a user from passing someone else's setup id
  if (
    intent.status !== "succeeded" ||
    !user?.stripeCustomerId ||
    intentCustomerId !== user.stripeCustomerId ||
    !paymentMethodId
  ) {
    throw new AppError("CARD_NOT_SAVED", "Save a card first, the card setup is not complete", 422);
  }

  // The price comes from the room, never from the client
  const conversion = await convert(room.pricePerNight * nights * rooms, room.currency, currency);
  const lateFee = await convert(room.pricePerNight * rooms, room.currency, currency);

  const snapshot: HotelBookingSnapshot = {
    hotelId,
    hotelName: hotel.name,
    city: hotel.city,
    photo: hotel.photos[0] ?? "",
    roomId,
    roomType: room.type,
    checkIn,
    checkOut,
    nights,
    rooms,
    guests,
    leadGuest: { givenName: leadGuest.givenName, familyName: leadGuest.familyName },
    email,
    phoneNumber,
    price: { amount: conversion.providerAmount, currency: conversion.providerCurrency },
    freeCancelUntil: freeCancelUntil(checkIn, SEEDED_FREE_CANCEL_HOURS),
    lateCancelFee: { amount: lateFee.amount, currency: lateFee.currency },
  };

  const bookingReference = `VT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  let booking: ExistingBooking;
  try {
    booking = await Booking.create({
      userId,
      type: "hotel",
      provider: "seeded",
      status: "confirmed",
      bookingReference,
      totalAmount: conversion.amount,
      currency: conversion.currency,
      providerAmount: conversion.providerAmount,
      providerCurrency: conversion.providerCurrency,
      fxRate: conversion.rate,
      fxRateAt: conversion.rateAt,
      snapshot,
      dedupeKey,
      stripeCustomerId: user.stripeCustomerId,
      stripePaymentMethodId: paymentMethodId,
    });
  } catch (error) {
    // The unique index refused it: a double click got in first
    if (isDuplicateKeyError(error)) {
      throw new AppError("BOOKING_EXISTS", "You already have a booking for this room and these dates", 409);
    }
    throw error;
  }

  // Two travellers can pass the check above together. Our booking is saved now, so a negative
  // count means we lost the race and must give the room back.
  const roomsLeftAfter = await getRoomsLeft(capacity, checkIn, checkOut);
  if ((roomsLeftAfter.get(roomId) ?? 0) < 0) {
    booking.status = "failed";
    await booking.save();
    throw new AppError("NO_AVAILABILITY", "Not enough rooms are free for these dates", 409);
  }

  return {
    bookingId: booking._id.toString(),
    bookingReference,
    status: booking.status,
    totalAmount: conversion.amount,
    currency: conversion.currency,
  };
};
