import { create } from "zustand";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@vibetrip/shared-types";

// Browser region -> one of our 8 currencies. Anything else falls back to INR (the mock's default).
const REGION_TO_CURRENCY: Record<string, CurrencyCode> = {
  IN: "INR",
  AE: "AED",
  GB: "GBP",
  US: "USD",
  SG: "SGD",
  JP: "JPY",
  TH: "THB",
  FR: "EUR",
  DE: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR"
};

const STORAGE_KEY = "vibetrip.currency";

function isSupported(value: string | null): value is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((code) => code === value);
}

// A saved choice wins, then the browser locale ("en-IN" -> IN -> INR), then INR.
// The currency is a harmless preference, so localStorage is fine here (unlike the access token).
function detectInitialCurrency(): CurrencyCode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isSupported(saved)) {
    return saved;
  }

  const region = navigator.language.split("-")[1]?.toUpperCase() ?? "";
  return REGION_TO_CURRENCY[region] ?? "INR";
}

interface CurrencyState {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

// Every API call that takes a price sends `currency: useCurrencyStore.getState().currency`.
// The server converts; the browser never converts or trusts its own numbers.
export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: detectInitialCurrency(),
  setCurrency: (currency) => {
    localStorage.setItem(STORAGE_KEY, currency);
    set({ currency });
  }
}));
