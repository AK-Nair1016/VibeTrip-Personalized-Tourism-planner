// Currencies a user can see and pay in (docs v1.1): one per city country.
export const SUPPORTED_CURRENCIES = [
  "INR",
  "AED",
  "GBP",
  "EUR",
  "USD",
  "SGD",
  "JPY",
  "THB",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// A price always travels with its currency.
export type Money = {
  amount: number;
  currency: string;
};
