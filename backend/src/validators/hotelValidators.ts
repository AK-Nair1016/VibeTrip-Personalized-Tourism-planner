import { isCityName, CITY_NAMES } from "../config/cities";
import { HOTEL_LIMITS, HOTEL_SORTS, SUPPORTED_CURRENCIES } from "../config/constants";
import { addDays, countNights } from "../utils/stayDates";
import { isDateString } from "./flightValidators";

// A Mongo ObjectId is exactly 24 hex characters. A malformed id would make Mongoose throw a
// CastError (a 500), so every route with an id in it checks this first and answers 422 instead.
export const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

const isSupportedCurrency = (value: unknown): boolean =>
  typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);

// Query values arrive as text ("2") and JSON values as numbers (2). Both are read as a whole number here.
const toWholeNumber = (value: unknown): number | null => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

interface StayInput {
  checkIn?: unknown;
  checkOut?: unknown;
  guests?: unknown;
  rooms?: unknown;
}

// The same dates-and-guests rules apply to the search, the room list and the booking, so they live once.
export const checkStay = (input: StayInput): string | null => {
  const { checkIn, checkOut, guests, rooms } = input;

  if (!checkIn) {
    return "Check-in date is required";
  }

  if (!checkOut) {
    return "Check-out date is required";
  }

  if (!guests) {
    return "Number of guests is required";
  }

  if (!isDateString(checkIn)) {
    return "Check-in must be a valid date in YYYY-MM-DD format";
  }

  if (!isDateString(checkOut)) {
    return "Check-out must be a valid date in YYYY-MM-DD format";
  }

  // YYYY-MM-DD text sorts in date order, so dates can be compared as text
  const today = new Date().toISOString().slice(0, 10);

  if (checkIn < today) {
    return "Check-in cannot be in the past";
  }

  if (checkIn > addDays(today, HOTEL_LIMITS.maxDaysAhead)) {
    return `Check-in must be within ${HOTEL_LIMITS.maxDaysAhead} days from today`;
  }

  if (checkOut <= checkIn) {
    return "Check-out must be after check-in";
  }

  const nights = countNights(checkIn, checkOut);

  if (nights > HOTEL_LIMITS.maxNights) {
    return `You can stay at most ${HOTEL_LIMITS.maxNights} nights`;
  }

  const guestCount = toWholeNumber(guests);

  if (guestCount === null || guestCount < 1 || guestCount > HOTEL_LIMITS.maxGuests) {
    return `Guests must be a whole number between 1 and ${HOTEL_LIMITS.maxGuests}`;
  }

  // Rooms is optional and means 1 when left out
  let roomCount = 1;
  if (rooms !== undefined) {
    const parsedRooms = toWholeNumber(rooms);

    if (parsedRooms === null || parsedRooms < 1 || parsedRooms > HOTEL_LIMITS.maxRooms) {
      return `Rooms must be a whole number between 1 and ${HOTEL_LIMITS.maxRooms}`;
    }
    roomCount = parsedRooms;
  }

  // Every room needs at least one guest in it
  if (guestCount < roomCount) {
    return "There cannot be more rooms than guests";
  }

  return null;
};

interface HotelSearchQueryInput extends StayInput {
  city?: unknown;
  currency?: unknown;
  minStars?: unknown;
  maxPrice?: unknown;
  sort?: unknown;
}

export const validateHotelSearch = (query: unknown): string | null => {
  if (!query || typeof query !== "object") {
    return "Search details are required";
  }

  const { city, currency, minStars, maxPrice, sort } = query as HotelSearchQueryInput;

  if (!city) {
    return "City is required";
  }

  if (!isCityName(city)) {
    return `City must be one of: ${CITY_NAMES.join(", ")}`;
  }

  const stayError = checkStay(query as StayInput);
  if (stayError) {
    return stayError;
  }

  if (currency && !isSupportedCurrency(currency)) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  if (minStars !== undefined) {
    const stars = toWholeNumber(minStars);

    if (stars === null || stars < 1 || stars > 5) {
      return "Minimum stars must be a whole number between 1 and 5";
    }
  }

  // maxPrice is per night, in the currency asked for
  if (maxPrice !== undefined) {
    const price = typeof maxPrice === "string" ? Number(maxPrice) : NaN;

    if (!Number.isFinite(price) || price <= 0) {
      return "Max price must be a number above 0";
    }
  }

  if (sort !== undefined && !(typeof sort === "string" && (HOTEL_SORTS as readonly string[]).includes(sort))) {
    return `Sort must be one of: ${HOTEL_SORTS.join(", ")}`;
  }

  return null;
};

// Used with source "params" on every /hotels/:id route
export const validateHotelId = (params: unknown): string | null => {
  if (!params || typeof params !== "object") {
    return "Hotel id is required";
  }

  const { id } = params as { id?: unknown };

  if (!id) {
    return "Hotel id is required";
  }

  if (!isObjectId(id)) {
    return "Hotel id is not valid";
  }

  return null;
};

// GET /hotels/:id/rooms needs the dates, because availability and price depend on them
export const validateRoomsQuery = (query: unknown): string | null => {
  if (!query || typeof query !== "object") {
    return "Stay details are required";
  }

  const stayError = checkStay(query as StayInput);
  if (stayError) {
    return stayError;
  }

  const { currency } = query as { currency?: unknown };

  if (currency && !isSupportedCurrency(currency)) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  return null;
};
