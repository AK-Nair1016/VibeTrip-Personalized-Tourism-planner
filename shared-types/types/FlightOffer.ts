import type { Money } from "./Currency";

// Cabin classes Duffel accepts (sent as cabin_class).
export const CABIN_CLASSES = ["economy", "premium_economy", "business", "first"] as const;

export type CabinClass = (typeof CABIN_CLASSES)[number];

// One actual flight (takeoff to landing).
export type FlightSegment = {
  airline: string; // marketing carrier name, e.g. "Duffel Airways"
  flightNumber: string; // carrier code + number, e.g. "ZZ 1234"
  origin: string; // airport code, e.g. "DEL"
  destination: string;
  departingAt: string; // local time at the origin airport, ISO string
  arrivingAt: string; // local time at the destination airport
};

// One direction of the trip (outbound or return), made of 1 or more segments.
export type FlightSlice = {
  origin: string;
  destination: string;
  duration: string; // ISO 8601 duration from Duffel, e.g. "PT2H10M"
  stops: number; // segments - 1
  segments: FlightSegment[];
};

// One bookable offer, already in our shape (never raw Duffel JSON).
export type FlightOffer = {
  offerId: string; // Duffel offer id, used by GET /flights/:offerId
  airline: string; // the airline selling the offer
  price: Money; // converted to the user's currency, margin included
  expiresAt: string; // after this the offer is gone (409 FARE_EXPIRED)
  slices: FlightSlice[]; // 1 for one-way, 2 for round-trip
};

// A traveller slot on an offer. Duffel needs these ids again at booking time.
export type OfferPassenger = {
  id: string; // Duffel passenger id, e.g. "pas_..."
  type: string; // "adult" for now
};

// The single-offer view: a FlightOffer plus the ids the booking step needs.
export type FlightOfferDetail = FlightOffer & {
  passengers: OfferPassenger[];
};

export type FlightSearchResult = {
  offerRequestId: string; // kept for the booking draft
  offers: FlightOffer[]; // cheapest first, at most 50
};
