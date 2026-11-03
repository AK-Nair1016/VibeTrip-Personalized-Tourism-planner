import type {
  CabinClass,
  CurrencyCode,
  FlightOfferDetail,
  FlightSearchResult
} from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string; // leave out for a one-way trip
  adults: number;
  cabinClass?: CabinClass;
  currency: CurrencyCode;
}

// Live search through Duffel. It can take up to about 15 seconds, so the page shows a loading state.
export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
  // axios leaves out params that are undefined, so a one-way trip sends no returnDate
  const response = await api.get<ApiResponse<FlightSearchResult>>("/flights/search", { params });
  return response.data.data;
}

// Re-fetches one live offer (the checkout does this so the price is never stale).
// A 409 FARE_EXPIRED means the fare is gone.
export async function fetchFlightOffer(
  offerId: string,
  currency: CurrencyCode
): Promise<FlightOfferDetail> {
  const response = await api.get<ApiResponse<FlightOfferDetail>>(`/flights/${offerId}`, {
    params: { currency }
  });
  return response.data.data;
}
