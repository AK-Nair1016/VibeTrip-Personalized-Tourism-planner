// Currency conversion (docs v1.1).
//
// Rates come from ExchangeRate-API: GET https://open.er-api.com/v6/latest/{BASE}
// - Free, no key, updates once a day. Calling too often gives a 429.
// - The frontend footer must show "Rates By Exchange Rate API"
//   linking to https://www.exchangerate-api.com
//
// Rules:
// - Duffel prices are in the base currency (AUD today).
// - Every conversion adds FX_MARGIN_PERCENT (2%), at search and at checkout,
//   so the price does not jump between the two.
// - Checkout saves the rate on the Booking; refunds reuse that rate.
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@vibetrip/shared-types";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const ONE_HOUR_MS = 60 * 60 * 1000;

type RatesTable = {
  base: string; // e.g. "AUD"
  rates: Record<string, number>; // 1 base = rates["INR"] rupees, and so on
  fetchedAt: number; // time of the fetch in ms, used by the cache
};

export type Conversion = {
  amount: number; // what the user sees and pays
  currency: CurrencyCode;
  rate: number; // rate used, margin included (saved as Booking.fxRate)
  rateAt: Date; // saved as Booking.fxRateAt
  providerAmount: number; // original Duffel price
  providerCurrency: string;
};

// Block 1: get today's rates for one base currency from the rates API.
const fetchRates = async (base: string): Promise<RatesTable> => {
  let data;
  try {
    const response = await fetch(`${env.FX_RATES_URL}/${base}`);
    data = await response.json();
  } catch {
    throw new AppError("PROVIDER_ERROR", "Could not reach the exchange rates service", 502);
  }

  if (data.result !== "success") {
    throw new AppError("PROVIDER_ERROR", "Exchange rates are not available right now", 502);
  }

  for (const code of SUPPORTED_CURRENCIES) {
    if (!data.rates[code]) {
      throw new AppError("PROVIDER_ERROR", `No exchange rate for ${code}`, 502);
    }
  }

  return { base, rates: data.rates, fetchedAt: Date.now() };
};

// Block 2: return the saved rates if they are less than an hour old,
// otherwise fetch fresh ones and save them.
const savedRates: Record<string, RatesTable> = {}; // one entry per base currency

export const getRates = async (base: string): Promise<RatesTable> => {
  const saved = savedRates[base];
  if (saved && Date.now() - saved.fetchedAt < ONE_HOUR_MS) {
    return saved;
  }

  const fresh = await fetchRates(base);
  savedRates[base] = fresh;
  return fresh;
};

// How many decimals a currency uses. JPY has no cents; the rest use 2.
const decimalsFor = (currency: string): number => {
  return currency === "JPY" ? 0 : 2;
};

// Block 3: round an amount to the number of decimals its currency uses,
// e.g. 20431.0472 INR -> 20431.05, 15234.6 JPY -> 15235.
export const roundForCurrency = (amount: number, currency: string): number => {
  const factor = 10 ** decimalsFor(currency);
  return Math.round(amount * factor) / factor;
};

// Block 4: convert a Duffel price into the user's currency, margin included.
export const convert = async (
  amount: number,
  from: string,
  to: CurrencyCode
): Promise<Conversion> => {
  // Same currency: nothing to convert, so no margin either
  if (from === to) {
    return {
      amount: roundForCurrency(amount, to),
      currency: to,
      rate: 1,
      rateAt: new Date(),
      providerAmount: amount,
      providerCurrency: from,
    };
  }

  const table = await getRates(from);
  const rate = table.rates[to] * (1 + env.FX_MARGIN_PERCENT / 100);

  return {
    amount: roundForCurrency(amount * rate, to),
    currency: to,
    rate,
    rateAt: new Date(table.fetchedAt),
    providerAmount: amount,
    providerCurrency: from,
  };
};

// Block 5: Stripe wants the smallest unit,
// e.g. 254.53 AUD -> 25453 cents, 1500 JPY -> 1500.
export const toMinorUnits = (amount: number, currency: string): number => {
  return Math.round(amount * 10 ** decimalsFor(currency));
};
