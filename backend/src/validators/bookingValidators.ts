import validator from "validator";
import type { PassengerInput } from "@vibetrip/shared-types";
import { SUPPORTED_CURRENCIES } from "../config/constants";
import { isDateString } from "./flightValidators";
import { checkStay, isObjectId } from "./hotelValidators";

const TITLES = ["mr", "ms", "mrs", "miss", "dr"];
const GENDERS = ["m", "f"];
const MAX_PASSENGERS = 9; // same cap as the search
const MAX_NAME_LENGTH = 50;

type FlightBookingBody = {
  offerId?: unknown;
  currency?: unknown;
  passengers?: unknown;
};

type PassengerBody = Partial<Record<keyof PassengerInput, unknown>>;

const isName = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  const length = value.trim().length;
  return length >= 1 && length <= MAX_NAME_LENGTH;
};

const isEmailAddress = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Duffel wants E.164: "+", the country code, digits only. The regex enforces that shape (some
// country patterns would let spaces and dashes through) and also caps the length. Then "any"
// tries every country's own number pattern, so each country's real digit count is enforced.
// Mobile numbers only; a landline is refused.
const isMobileNumber = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\+\d{8,15}$/.test(value) &&
  validator.isMobilePhone(value, "any", { strictMode: true });

// We do NOT check here that passengers.length matches the offer. That needs
// the offer from Duffel, so the service does it.
export const validateFlightBooking = (body: unknown): string | null => {
  // Express 5 leaves req.body undefined when the client sends no JSON
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const { offerId, currency, passengers } = body as FlightBookingBody;

  if (!offerId) {
    return "Offer id is required";
  }

  // typeof first: a client can send a number or an object instead of text
  if (typeof offerId !== "string" || !/^off_[A-Za-z0-9_]+$/.test(offerId)) {
    return "Offer id is not valid";
  }

  if (!currency) {
    return "Currency is required";
  }

  if (
    typeof currency !== "string" ||
    !(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
  ) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  // Array.isArray, because a string such as "abc" also has a length
  if (!Array.isArray(passengers) || passengers.length === 0) {
    return "At least one passenger is required";
  }

  if (passengers.length > MAX_PASSENGERS) {
    return `You can book at most ${MAX_PASSENGERS} passengers`;
  }

  // YYYY-MM-DD text sorts in date order, so a born-on date can be compared as text
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < passengers.length; i++) {
    // The number lets the frontend show which traveller form is wrong
    const label = `Passenger ${i + 1}`;
    const passenger: unknown = passengers[i];

    if (!passenger || typeof passenger !== "object") {
      return `${label}: details are required`;
    }

    const { title, givenName, familyName, bornOn, gender, email, phoneNumber } =
      passenger as PassengerBody;

    if (typeof title !== "string" || !TITLES.includes(title)) {
      return `${label}: title must be one of: ${TITLES.join(", ")}`;
    }

    if (!isName(givenName)) {
      return `${label}: first name must be 1 to ${MAX_NAME_LENGTH} characters`;
    }

    if (!isName(familyName)) {
      return `${label}: last name must be 1 to ${MAX_NAME_LENGTH} characters`;
    }

    if (typeof bornOn !== "string" || !isDateString(bornOn)) {
      return `${label}: date of birth must be a real date written as YYYY-MM-DD`;
    }

    if (bornOn >= today) {
      return `${label}: date of birth must be in the past`;
    }

    if (typeof gender !== "string" || !GENDERS.includes(gender)) {
      return `${label}: gender must be one of: ${GENDERS.join(", ")}`;
    }

    if (!isEmailAddress(email)) {
      return `${label}: email is not valid`;
    }

    if (!isMobileNumber(phoneNumber)) {
      return `${label}: phone number must be a valid mobile number with country code, like +919999999999`;
    }
  }

  return null;
};

type HotelBookingBody = {
  hotelId?: unknown;
  roomId?: unknown;
  setupIntentId?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  rooms?: unknown;
  guests?: unknown;
  leadGuest?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  currency?: unknown;
};

// Checks the shape only. Whether the room exists, fits the guests and is free for the dates
// needs the database, so the service decides that.
export const validateHotelBooking = (body: unknown): string | null => {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const {
    hotelId,
    roomId,
    setupIntentId,
    checkIn,
    checkOut,
    rooms,
    guests,
    leadGuest,
    email,
    phoneNumber,
    currency,
  } = body as HotelBookingBody;

  if (!hotelId) {
    return "Hotel id is required";
  }

  if (!isObjectId(hotelId)) {
    return "Hotel id is not valid";
  }

  if (!roomId) {
    return "Room id is required";
  }

  if (!isObjectId(roomId)) {
    return "Room id is not valid";
  }

  if (!setupIntentId) {
    return "Saved card is required, set up a card first";
  }

  if (typeof setupIntentId !== "string" || !setupIntentId.startsWith("seti_")) {
    return "Saved card id is not valid";
  }

  if (rooms === undefined) {
    return "Number of rooms is required";
  }

  // Dates, guests and rooms follow the same rules as the search
  const stayError = checkStay({ checkIn, checkOut, guests, rooms });
  if (stayError) {
    return stayError;
  }

  if (!leadGuest || typeof leadGuest !== "object") {
    return "Lead guest details are required";
  }

  const { givenName, familyName } = leadGuest as { givenName?: unknown; familyName?: unknown };

  if (!isName(givenName)) {
    return `Lead guest first name must be 1 to ${MAX_NAME_LENGTH} characters`;
  }

  if (!isName(familyName)) {
    return `Lead guest last name must be 1 to ${MAX_NAME_LENGTH} characters`;
  }

  if (!isEmailAddress(email)) {
    return "Email is not valid";
  }

  if (!isMobileNumber(phoneNumber)) {
    return "Phone number must be a valid mobile number with country code, like +919999999999";
  }

  if (!currency) {
    return "Currency is required";
  }

  if (
    typeof currency !== "string" ||
    !(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
  ) {
    return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`;
  }

  return null;
};

// Used on GET /bookings/:id with source "params"
export const validateBookingId = (params: unknown): string | null => {
  // Express 5 can leave params undefined, so guard before destructuring
  if (!params || typeof params !== "object") {
    return "Booking id is required";
  }

  const { id } = params as { id?: unknown };

  if (!id) {
    return "Booking id is required";
  }

  // A malformed id would make Mongoose throw a CastError (a 500), so reject it here as a 422.
  // A Mongo ObjectId is exactly 24 hex characters.
  if (typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return "Booking id is not valid";
  }

  return null;
};
