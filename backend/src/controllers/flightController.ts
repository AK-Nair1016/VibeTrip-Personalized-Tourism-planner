import { Request, Response } from "express";
import type { CabinClass, CurrencyCode } from "@vibetrip/shared-types";
import type { CityCode } from "../config/cities";
import {
  getFlightOffer as getFlightOfferService,
  searchFlights as searchFlightsService,
  type FlightSearchParams,
} from "../services/duffelFlightService";
import { catchAsync } from "../utils/catchAsync";

// Used when the frontend sends no currency (it normally always does).
const DEFAULT_CURRENCY: CurrencyCode = "INR";
const DEFAULT_CABIN_CLASS: CabinClass = "economy";
const DEFAULT_MAX_CONNECTIONS = 1;

// Every value in a URL query is text, and optional ones may be missing.
type SearchQuery = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: string;
  cabinClass?: string;
  maxConnections?: string;
  currency?: string;
};

// The validator already checked the query, so here we only change text into
// numbers and fill in defaults for the optional values.
const toSearchParams = (query: SearchQuery): FlightSearchParams => {
  let cabinClass: CabinClass = DEFAULT_CABIN_CLASS;
  if (query.cabinClass) {
    cabinClass = query.cabinClass as CabinClass;
  }

  let currency: CurrencyCode = DEFAULT_CURRENCY;
  if (query.currency) {
    currency = query.currency as CurrencyCode;
  }

  // Check for undefined, not "falsy", because "0" (direct flights only) is valid
  let maxConnections = DEFAULT_MAX_CONNECTIONS;
  if (query.maxConnections !== undefined) {
    maxConnections = Number(query.maxConnections);
  }

  const params: FlightSearchParams = {
    origin: query.origin as CityCode,
    destination: query.destination as CityCode,
    departureDate: query.departureDate,
    adults: Number(query.adults),
    cabinClass,
    maxConnections,
    currency,
  };

  // No return date means a one-way trip
  if (query.returnDate) {
    params.returnDate = query.returnDate;
  }

  return params;
};

// GET /api/flights/search
export const searchFlights = catchAsync(async (req: Request, res: Response) => {
  const params = toSearchParams(req.query as unknown as SearchQuery);

  const result = await searchFlightsService(params);

  res.status(200).json({
    success: true,
    message: "Flights fetched successfully",
    data: result,
  });
});

// GET /api/flights/:offerId  (logged-in users)
export const getFlightOffer = catchAsync(async (req: Request, res: Response) => {
  // The validators already checked both values
  const offerId = req.params.offerId as string;

  let currency: CurrencyCode = DEFAULT_CURRENCY;
  const requestedCurrency = req.query.currency as string | undefined;
  if (requestedCurrency) {
    currency = requestedCurrency as CurrencyCode;
  }

  const offer = await getFlightOfferService(offerId, currency);

  res.status(200).json({
    success: true,
    message: "Flight offer fetched successfully",
    data: offer,
  });
});
