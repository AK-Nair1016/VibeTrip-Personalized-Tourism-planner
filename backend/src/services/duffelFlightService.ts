// Live flight search through Duffel (see docs/DUFFEL.md, "Flights").
//
// Rules:
// - Every request sends Authorization and Duffel-Version: v2.
// - Prices come back in the base currency (AUD); fxService converts them.
// - Nothing is stored: offers expire within minutes.
// - Controllers and the frontend only ever see our FlightOffer shape.
import type {
  CabinClass,
  CurrencyCode,
  FlightOffer,
  FlightOfferDetail,
  FlightSearchResult,
  FlightSegment,
  FlightSlice,
  OfferPassenger,
} from "@vibetrip/shared-types";
import type { CityCode } from "../config/cities";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { convert, type Conversion } from "./fxService";

const DUFFEL_BASE_URL = "https://api.duffel.com";
const MAX_OFFERS = 50; // decision 5: the 50 cheapest per search

// What the controller hands us, already validated and parsed.
export type FlightSearchParams = {
  origin: CityCode;
  destination: CityCode;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // present = round-trip
  adults: number;
  cabinClass: CabinClass;
  maxConnections: number;
  currency: CurrencyCode;
};

// The parts of Duffel's offer JSON we read. Duffel sends much more; we ignore the rest.
type DuffelSegment = {
  origin: { iata_code: string };
  destination: { iata_code: string };
  departing_at: string;
  arriving_at: string;
  marketing_carrier: { name: string; iata_code: string };
  marketing_carrier_flight_number: string;
};

type DuffelSlice = {
  origin: { iata_code: string };
  destination: { iata_code: string };
  duration: string;
  segments: DuffelSegment[];
};

type DuffelOffer = {
  id: string;
  total_amount: string; // a string, e.g. "109.27"
  total_currency: string;
  expires_at: string;
  owner: { name: string };
  slices: DuffelSlice[];
  passengers: { id: string; type: string }[]; // ids needed again at booking
};

// What Duffel sends back for one offer (GET /air/offers/:id).
type DuffelOfferResponse = {
  data: DuffelOffer;
};

// What Duffel sends back for a search.
type DuffelSearchResponse = {
  data: {
    id: string; // the offer request id
    offers: DuffelOffer[];
  };
};

// What Duffel sends back when something is wrong.
type DuffelErrorBody = {
  errors?: { message: string; code?: string }[];
};

// Block 1: send one request to Duffel and return the parsed JSON body.
// <T> lets each caller say what shape it expects back.
// Network failure or a non-2xx status becomes AppError("PROVIDER_ERROR", ..., 502).
const duffelRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const url = `${DUFFEL_BASE_URL}${path}`;

  // Our headers come after ...init so a caller can never replace the auth header.
  const headers = {
    Authorization: `Bearer ${env.DUFFEL_API_KEY}`,
    "Duffel-Version": "v2",
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    // fetch only throws when the request never got an answer (network down)
    throw new AppError("PROVIDER_ERROR", "Could not reach the flight provider", 502);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AppError("PROVIDER_ERROR", "The flight provider sent an unreadable answer", 502);
  }

  // fetch does NOT throw on 401, 422, 429 and so on, so we check response.ok ourselves.
  if (!response.ok) {
    let reason = "no message";
    let errorCode = "no code";
    const errorBody = body as DuffelErrorBody | null;
    if (errorBody && errorBody.errors && errorBody.errors.length > 0) {
      reason = errorBody.errors[0].message;
      if (errorBody.errors[0].code) {
        errorCode = errorBody.errors[0].code;
      }
    }

    // "Gone" is not an outage. Duffel says it with a 404 for an unknown id, and with
    // a 422 ("Please select another offer...") for an offer that has expired.
    // Callers get their own code and decide what it means (see F3).
    const offerIsGone =
      response.status === 404 ||
      errorCode === "offer_no_longer_available" ||
      reason.includes("select another offer");

    if (offerIsGone) {
      throw new AppError("PROVIDER_NOT_FOUND", "The flight provider has no record of that item", 404);
    }

    // The real reason goes to our logs only; the traveller gets a generic message.
    console.error(`Duffel error ${response.status} (${errorCode}): ${reason}`);
    throw new AppError("PROVIDER_ERROR", "The flight provider could not complete the request", 502);
  }

  return body as T;
};

// Block 2: turn our params into Duffel's offer request body.
// One-way = 1 slice; round-trip = 2 slices (the return flips origin and destination).
const buildOfferRequestBody = (params: FlightSearchParams) => {
  const slices = [
    {
      origin: params.origin,
      destination: params.destination,
      departure_date: params.departureDate,
    },
  ];

  if (params.returnDate) {
    slices.push({
      origin: params.destination,
      destination: params.origin,
      departure_date: params.returnDate,
    });
  }

  // Duffel wants one entry per traveller
  const passengers = [];
  for (let i = 0; i < params.adults; i++) {
    passengers.push({ type: "adult" });
  }

  return {
    data: {
      slices,
      passengers,
      cabin_class: params.cabinClass,
      max_connections: params.maxConnections,
    },
  };
};

// Block 3a: map one actual flight (takeoff to landing).
const mapSegment = (raw: DuffelSegment): FlightSegment => {
  return {
    airline: raw.marketing_carrier.name,
    flightNumber: `${raw.marketing_carrier.iata_code} ${raw.marketing_carrier_flight_number}`,
    origin: raw.origin.iata_code,
    destination: raw.destination.iata_code,
    departingAt: raw.departing_at,
    arrivingAt: raw.arriving_at,
  };
};

// Block 3b: map one raw Duffel offer into our FlightOffer.
// The price is passed in already converted, so this stays a plain mapping
// with no network calls.
const mapOffer = (raw: DuffelOffer, price: FlightOffer["price"]): FlightOffer => {
  const slices: FlightSlice[] = [];

  for (const rawSlice of raw.slices) {
    const segments: FlightSegment[] = [];
    for (const rawSegment of rawSlice.segments) {
      segments.push(mapSegment(rawSegment));
    }

    slices.push({
      origin: rawSlice.origin.iata_code,
      destination: rawSlice.destination.iata_code,
      duration: rawSlice.duration,
      stops: segments.length - 1, // 1 flight = direct, 2 flights = 1 stop
      segments,
    });
  }

  return {
    offerId: raw.id,
    airline: raw.owner.name,
    price,
    expiresAt: raw.expires_at,
    slices,
  };
};

// Block 4: the public search.
// Ask Duffel, keep the 50 cheapest, convert each price, map to our shape.
export const searchFlights = async (
  params: FlightSearchParams
): Promise<FlightSearchResult> => {
  const requestBody = buildOfferRequestBody(params);

  const result = await duffelRequest<DuffelSearchResponse>(
    "/air/offer_requests?return_offers=true&supplier_timeout=10000",
    { method: "POST", body: JSON.stringify(requestBody) }
  );

  // total_amount is text ("109.27"), so turn it into a number before comparing.
  // Compare in Duffel's own currency, before converting, so the order is exact.
  const rawOffers = result.data.offers;
  rawOffers.sort((a, b) => Number(a.total_amount) - Number(b.total_amount));
  const cheapestOffers = rawOffers.slice(0, MAX_OFFERS);

  // One by one is fine: fxService caches the rates, so only the first call
  // can touch the network.
  const offers: FlightOffer[] = [];
  for (const rawOffer of cheapestOffers) {
    const converted = await convert(
      Number(rawOffer.total_amount),
      rawOffer.total_currency,
      params.currency
    );
    const price = { amount: converted.amount, currency: converted.currency };
    offers.push(mapOffer(rawOffer, price));
  }

  return { offerRequestId: result.data.id, offers };
};

// F3, step 1: fetch one offer from Duffel and make sure it is still bookable.
const fetchOfferOrExpire = async (offerId: string): Promise<DuffelOffer> => {
  // An offer can be gone in two ways, and the traveller sees the same message for both.
  const expiredMessage = "This fare is no longer available. Please search again.";

  let response: DuffelOfferResponse;
  try {
    response = await duffelRequest<DuffelOfferResponse>(`/air/offers/${offerId}`);
  } catch (error) {
    // 1. Duffel has forgotten the offer (404)
    if (error instanceof AppError && error.code === "PROVIDER_NOT_FOUND") {
      throw new AppError("FARE_EXPIRED", expiredMessage, 409);
    }
    // A real failure (Duffel down, bad key) must stay a 502, so pass it on unchanged
    throw error;
  }

  // 2. Duffel still returns it, but its time limit has passed
  const expiresAt = new Date(response.data.expires_at).getTime();
  if (expiresAt < Date.now()) {
    throw new AppError("FARE_EXPIRED", expiredMessage, 409);
  }

  return response.data;
};

// F3, step 2: the single-offer view used before booking.
// Re-fetching matters because offers expire within minutes and prices move.
export const getFlightOffer = async (
  offerId: string,
  currency: CurrencyCode
): Promise<FlightOfferDetail> => {
  const rawOffer = await fetchOfferOrExpire(offerId);

  const converted = await convert(
    Number(rawOffer.total_amount),
    rawOffer.total_currency,
    currency
  );
  const price = { amount: converted.amount, currency: converted.currency };

  // Keep the passenger ids: the booking step must send them back to Duffel
  const passengers: OfferPassenger[] = [];
  for (const rawPassenger of rawOffer.passengers) {
    passengers.push({ id: rawPassenger.id, type: rawPassenger.type });
  }

  return { ...mapOffer(rawOffer, price), passengers };
};

// F5: the same re-fetch as getFlightOffer, but checkout also needs the conversion
// (rate, rateAt, providerAmount, providerCurrency) to lock on the Booking.
// getFlightOffer throws those away, so checkout cannot use it.
export type CheckoutOffer = {
  offer: FlightOfferDetail;
  conversion: Conversion;
};

export const getOfferForCheckout = async (
  offerId: string,
  currency: CurrencyCode
): Promise<CheckoutOffer> => {
  // Throws 409 FARE_EXPIRED if the offer is gone, so checkout never prices a dead fare
  const rawOffer = await fetchOfferOrExpire(offerId);

  // Keep the whole result: its rate and provider price get locked on the Booking
  const conversion = await convert(
    Number(rawOffer.total_amount),
    rawOffer.total_currency,
    currency
  );

  // Only amount and currency go into the offer, so the rate never leaks into
  // the snapshot or the response
  const price = { amount: conversion.amount, currency: conversion.currency };

  const passengers: OfferPassenger[] = [];
  for (const rawPassenger of rawOffer.passengers) {
    passengers.push({ id: rawPassenger.id, type: rawPassenger.type });
  }

  const offer: FlightOfferDetail = { ...mapOffer(rawOffer, price), passengers };

  return { offer, conversion };
};

// F6: create the Duffel order after Stripe has authorised the card.
// One traveller as Duffel wants them: the pas_ id from the offer request is paired in
// by bookingService at F5, so the webhook can read it back from the Booking snapshot.
export interface DuffelOrderPassenger {
  id: string; // pas_...
  title: string;
  gender: string;
  givenName: string;
  familyName: string;
  bornOn: string; // YYYY-MM-DD
  email: string;
  phoneNumber: string;
}

export interface DuffelOrderData {
  offerId: string;
  providerAmount: number; // base currency, must match the offer exactly
  providerCurrency: string;
  passengers: DuffelOrderPassenger[];
}

export interface DuffelOrderResult {
  providerBookingId: string; // Duffel order id, ord_...
  bookingReference: string; // the airline reference, e.g. ABC123
}

type DuffelOrderResponse = {
  data: { id: string; booking_reference: string };
};

// No retry here: if this throws, the webhook releases the card hold
export const createDuffelOrder = async (data: DuffelOrderData): Promise<DuffelOrderResult> => {
  const { offerId, providerAmount, providerCurrency, passengers } = data;

  // Duffel wants snake_case, so our camelCase names are renamed one by one
  const duffelPassengers = [];
  for (const passenger of passengers) {
    duffelPassengers.push({
      id: passenger.id,
      title: passenger.title,
      gender: passenger.gender,
      given_name: passenger.givenName,
      family_name: passenger.familyName,
      born_on: passenger.bornOn,
      email: passenger.email,
      phone_number: passenger.phoneNumber,
    });
  }

  const body = {
    data: {
      type: "instant",
      selected_offers: [offerId],
      // The amount is a string and must equal the offer's price, or Duffel rejects the order.
      // toFixed(2) is right because the base currency (AUD) has two decimals.
      payments: [{ type: "balance", currency: providerCurrency, amount: providerAmount.toFixed(2) }],
      passengers: duffelPassengers,
    },
  };

  const result = await duffelRequest<DuffelOrderResponse>("/air/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return { providerBookingId: result.data.id, bookingReference: result.data.booking_reference };
};
