import { isCityCode } from "../config/cities";
import { CABIN_CLASSES, SUPPORTED_CURRENCIES } from "../config/constants";
import type { FlightSearchQuery } from "../services/duffelFlightService";

const MAX_ADULTS = 9; // Duffel allows at most 9 passengers per search
const MAX_CONNECTIONS = 2;

// "value is string" lets TypeScript treat the value as text after a successful check
export const isDateString = (value: unknown): value is string => {
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

type FlightSearchBody = Partial<Record<keyof FlightSearchQuery, unknown>>;

const isSupportedCurrency = (value: unknown): boolean =>
  typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);

// Every query value arrives as a string (or is missing). Express can also give an array or an
// object (?origin[]=DEL), so values are checked as unknown.
export const validateFlightSearch = (query: unknown): string | null => {
  if (!query || typeof query !== "object") {
    return "Search details are required";
  }

  const {
    origin,
    destination,
    departureDate,
    returnDate,
    adults,
    cabinClass,
    maxConnections,
    currency,
  } = query as FlightSearchBody;

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

  if (!isCityCode(origin)) {
    return "Origin is not a supported city code";
  }

  if (!isCityCode(destination)) {
    return "Destination is not a supported city code";
  }

  if (origin === destination) {
    return "Origin and destination must be different";
  }

  // YYYY-MM-DD strings compare correctly as plain text.
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

  // Numbers arrive as strings, so convert before checking
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

  if (cabinClass && !(typeof cabinClass === "string" && (CABIN_CLASSES as readonly string[]).includes(cabinClass))) {
    return `Cabin class must be one of: ${CABIN_CLASSES.join(", ")}`;
  }

  if (currency && !isSupportedCurrency(currency)) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  return null;
};

// Duffel offer ids look like "off_0000AbCd..." (letters, digits, underscores).
export const validateOfferId = (params: unknown): string | null => {
  if (!params || typeof params !== "object") {
    return "Offer id is required";
  }

  const { offerId } = params as { offerId?: unknown };

  if (!offerId) {
    return "Offer id is required";
  }

  if (typeof offerId !== "string" || !/^off_[A-Za-z0-9_]+$/.test(offerId)) {
    return "Offer id is not valid";
  }

  return null;
};

export const validateOfferQuery = (query: unknown): string | null => {
  if (!query || typeof query !== "object") {
    return null;
  }

  const { currency } = query as { currency?: unknown };

  if (currency && !isSupportedCurrency(currency)) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  return null;
};
