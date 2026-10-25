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
const MAX_OFFERS = 50;

export type FlightSearchParams = {
  origin: CityCode;
  destination: CityCode;
  departureDate: string;
  returnDate?: string;
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
  total_amount: string;
  total_currency: string;
  expires_at: string;
  owner: { name: string };
  slices: DuffelSlice[];
  passengers: { id: string; type: string }[];
};

type DuffelOfferResponse = {
  data: DuffelOffer;
};

type DuffelSearchResponse = {
  data: {
    id: string;
    offers: DuffelOffer[];
  };
};

type DuffelErrorBody = {
  errors?: { message: string; code?: string }[];
};

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

const fetchOfferOrExpire = async (offerId: string): Promise<DuffelOffer> => {
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

  const passengers: OfferPassenger[] = [];
  for (const rawPassenger of rawOffer.passengers) {
    passengers.push({ id: rawPassenger.id, type: rawPassenger.type });
  }

  return { ...mapOffer(rawOffer, price), passengers };
};

// Same as getFlightOffer, but also returns the conversion (rate, provider price) that checkout locks on the Booking
export type CheckoutOffer = {
  offer: FlightOfferDetail;
  conversion: Conversion;
};

export const getOfferForCheckout = async (
  offerId: string,
  currency: CurrencyCode
): Promise<CheckoutOffer> => {
  const rawOffer = await fetchOfferOrExpire(offerId);

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

export interface DuffelOrderPassenger {
  id: string;
  title: string;
  gender: string;
  givenName: string;
  familyName: string;
  bornOn: string;
  email: string;
  phoneNumber: string;
}

export interface DuffelOrderData {
  offerId: string;
  providerAmount: number;
  providerCurrency: string;
  passengers: DuffelOrderPassenger[];
}

export interface DuffelOrderResult {
  providerBookingId: string;
  bookingReference: string;
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

// What the booking detail page shows from Duffel. Our own shape: raw Duffel JSON never leaves this file.
// Only the fields that can change after booking. Route, times and price are already in our snapshot.
export interface FlightLiveStatus {
  availableActions: string[]; // for example "cancel", "change", "update"
  cancelledAt: string | null;
  hasAirlineChanges: boolean; // the airline changed the schedule after we booked
  syncedAt: string; // when Duffel last checked with the airline
}

type DuffelOrderStatusResponse = {
  data: {
    available_actions: string[];
    cancelled_at: string | null;
    airline_initiated_changes: unknown[];
    synced_at: string;
  };
};

// GET /air/orders/:orderId. Throws PROVIDER_ERROR if Duffel is down; the caller decides what to do.
export const getDuffelOrderStatus = async (orderId: string): Promise<FlightLiveStatus> => {
  const result = await duffelRequest<DuffelOrderStatusResponse>(`/air/orders/${orderId}`);
  const order = result.data;

  return {
    availableActions: order.available_actions,
    cancelledAt: order.cancelled_at,
    hasAirlineChanges: order.airline_initiated_changes.length > 0,
    syncedAt: order.synced_at,
  };
};
