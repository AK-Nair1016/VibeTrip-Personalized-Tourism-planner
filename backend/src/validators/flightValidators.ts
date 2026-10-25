import { CABIN_CLASSES, SUPPORTED_CURRENCIES } from "@vibetrip/shared-types";
import { isCityCode } from "../config/cities";

const MAX_ADULTS = 9; // Duffel allows at most 9 passengers per search
const MAX_CONNECTIONS = 2;

// True for a real calendar date written as YYYY-MM-DD, e.g. "2026-11-20".
export const isDateString = (value: unknown): boolean => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  // "2027-02-31" is accepted by Date and rolls over to March 3rd, so turning the
  // date back into text no longer matches what the user typed. That catches it.
  return date.toISOString().slice(0, 10) === value;
};

// GET /api/flights/search?origin=DEL&destination=BOM&departureDate=2026-11-20&adults=1
// Every query value arrives as a string (or is missing).
export const validateFlightSearch = (query: any): string | null => {
  const {
    origin,
    destination,
    departureDate,
    returnDate,
    adults,
    cabinClass,
    maxConnections,
    currency,
  } = query;

  // 1. Required fields must be present
  if (!origin) {
    return "Origin is required";
  }

  if (!destination) {
    return "Destination is required";
  }

  if (!departureDate) {
    return "Departure date is required";
  }

  if (!adults) {
    return "Number of adults is required";
  }

  // 2. Cities must be one of our 10, and the trip must go somewhere
  if (!isCityCode(origin)) {
    return "Origin is not a supported city code";
  }

  if (!isCityCode(destination)) {
    return "Destination is not a supported city code";
  }

  if (origin === destination) {
    return "Origin and destination must be different";
  }

  // 3. Dates. YYYY-MM-DD strings compare correctly as plain text.
  const today = new Date().toISOString().slice(0, 10);

  if (!isDateString(departureDate)) {
    return "Departure date must be a valid date in YYYY-MM-DD format";
  }

  if (departureDate < today) {
    return "Departure date cannot be in the past";
  }

  if (returnDate) {
    if (!isDateString(returnDate)) {
      return "Return date must be a valid date in YYYY-MM-DD format";
    }

    if (returnDate < departureDate) {
      return "Return date cannot be before the departure date";
    }
  }

  // 4. Numbers arrive as strings, so convert before checking
  const adultCount = Number(adults);

  if (!Number.isInteger(adultCount) || adultCount < 1 || adultCount > MAX_ADULTS) {
    return `Adults must be a whole number between 1 and ${MAX_ADULTS}`;
  }

  if (maxConnections !== undefined) {
    const connections = Number(maxConnections);

    if (!Number.isInteger(connections) || connections < 0 || connections > MAX_CONNECTIONS) {
      return `Max connections must be a whole number between 0 and ${MAX_CONNECTIONS}`;
    }
  }

  // 5. Optional values that must come from a fixed list
  if (cabinClass && !(CABIN_CLASSES as readonly string[]).includes(cabinClass)) {
    return `Cabin class must be one of: ${CABIN_CLASSES.join(", ")}`;
  }

  if (currency && !(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  return null;
};

// GET /api/flights/:offerId  (checks req.params)
// Duffel offer ids look like "off_0000AbCd..." (letters, digits, underscores).
export const validateOfferId = (params: any): string | null => {
  const { offerId } = params;

  if (!offerId) {
    return "Offer id is required";
  }

  if (!/^off_[A-Za-z0-9_]+$/.test(offerId)) {
    return "Offer id is not valid";
  }

  return null;
};

// GET /api/flights/:offerId?currency=INR  (checks req.query)
export const validateOfferQuery = (query: any): string | null => {
  const { currency } = query;

  if (currency && !(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  return null;
};
