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

// Fails to compile if shared-types gains a currency or cabin class that is missing above
type Missing = Exclude<CurrencyCode, (typeof SUPPORTED_CURRENCIES)[number]> |
  Exclude<CabinClass, (typeof CABIN_CLASSES)[number]>;
export const allListsComplete: [Missing] extends [never] ? true : never = true;
