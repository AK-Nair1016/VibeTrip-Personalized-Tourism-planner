import type { CabinClass, CurrencyCode } from "@vibetrip/shared-types";

// The backend owns these lists at runtime. shared-types ships TypeScript source only (no compiled
// JS), so `node dist/index.js` cannot load values from it. Types are fine: the compiler erases them.
// `satisfies` fails the build if an entry is not a valid CurrencyCode / CabinClass.
export const SUPPORTED_CURRENCIES = [
  "INR",
  "AED",
  "GBP",
  "EUR",
  "USD",
  "SGD",
  "JPY",
  "THB",
] as const satisfies readonly CurrencyCode[];

export const CABIN_CLASSES = [
  "economy",
  "premium_economy",
  "business",
  "first",
] as const satisfies readonly CabinClass[];

// Providers are paid in this currency, and seeded hotel prices are stored in it. fxService
// converts it to the traveller's currency at checkout.
export const BASE_CURRENCY = "AUD";

// How long a traveller has to pay. After this an unpaid booking is let go and its fare is free again. Flights only: hotels are paid at the property.
export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export const HOTEL_LIMITS = {
  maxNights: 30,
  maxRooms: 4,
  maxGuests: 8,
  maxDaysAhead: 365,
  maxLiveBookings: 5,
} as const;

// Free to cancel online until this many hours before check-in; after that a late fee applies.
export const SEEDED_FREE_CANCEL_HOURS = 48;

export const HOTEL_SORTS = ["price_asc", "price_desc", "rating", "stars"] as const;

export const PROPERTY_TYPES = ["hotel", "resort", "apartment", "hostel"] as const;

// Fails to compile if shared-types gains a currency or cabin class that is missing above
type Missing = Exclude<CurrencyCode, (typeof SUPPORTED_CURRENCIES)[number]> |
  Exclude<CabinClass, (typeof CABIN_CLASSES)[number]>;
export const allListsComplete: [Missing] extends [never] ? true : never = true;
