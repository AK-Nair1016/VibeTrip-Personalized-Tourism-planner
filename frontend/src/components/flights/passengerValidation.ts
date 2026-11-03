import type { PassengerInput } from "@vibetrip/shared-types";
import { todayString } from "./flightFormat";

// One error message per field, only for the fields that are wrong.
export type PassengerErrors = Partial<Record<keyof PassengerInput, string>>;

// The values are exactly what the backend accepts (lowercase). The labels are for people.
export const TITLE_OPTIONS = [
  { value: "mr", label: "Mr" },
  { value: "ms", label: "Ms" },
  { value: "mrs", label: "Mrs" },
  { value: "miss", label: "Miss" },
  { value: "dr", label: "Dr" }
];

export const GENDER_OPTIONS = [
  { value: "m", label: "Male" },
  { value: "f", label: "Female" }
];

const MAX_NAME_LENGTH = 50;

// Title and gender start empty on purpose: a wrong default would end up on a real ticket.
export function emptyPassenger(email: string): PassengerInput {
  return {
    title: "",
    gender: "",
    givenName: "",
    familyName: "",
    bornOn: "",
    phoneNumber: "",
    email
  };
}

// People type "+91 98765-43210". The backend wants "+" and digits only, so strip the rest.
export function cleanPhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

// The same rules as the backend's validator, so mistakes show next to the field.
// The server checks again (and is stricter about the phone number), so its message may still appear.
export function validatePassenger(passenger: PassengerInput): PassengerErrors {
  const errors: PassengerErrors = {};

  if (!TITLE_OPTIONS.some((option) => option.value === passenger.title)) {
    errors.title = "Choose a title";
  }

  if (!GENDER_OPTIONS.some((option) => option.value === passenger.gender)) {
    errors.gender = "Choose a gender";
  }

  const givenLength = passenger.givenName.trim().length;
  if (givenLength < 1 || givenLength > MAX_NAME_LENGTH) {
    errors.givenName = `Enter 1 to ${MAX_NAME_LENGTH} characters`;
  }

  const familyLength = passenger.familyName.trim().length;
  if (familyLength < 1 || familyLength > MAX_NAME_LENGTH) {
    errors.familyName = `Enter 1 to ${MAX_NAME_LENGTH} characters`;
  }

  // The date input gives YYYY-MM-DD, which also compares correctly as plain text
  if (!/^\d{4}-\d{2}-\d{2}$/.test(passenger.bornOn)) {
    errors.bornOn = "Enter the date of birth";
  } else if (passenger.bornOn >= todayString()) {
    errors.bornOn = "Date of birth must be in the past";
  }

  if (!/^\+\d{8,15}$/.test(cleanPhone(passenger.phoneNumber))) {
    errors.phoneNumber = "Use a mobile number with country code, like +919999999999";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passenger.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  return errors;
}
