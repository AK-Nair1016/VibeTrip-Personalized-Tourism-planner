import type { CurrencyCode, PassengerInput } from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";

export interface CreateFlightBookingInput {
  offerId: string;
  passengers: PassengerInput[];
  currency: CurrencyCode;
}

// What the backend returns once the booking is saved and the card hold can start.
export interface FlightCheckoutResult {
  bookingId: string;
  clientSecret: string; // Stripe PaymentIntent secret, used to confirm the card
  totalAmount: number; // the server's price, in `currency`
  currency: string;
}

// Starts a flight checkout. The price comes from the server, never from this request.
// Known 409s: FARE_EXPIRED, CHECKOUT_PENDING, CHECKOUT_IN_PROGRESS, BOOKING_EXISTS.
export async function createFlightBooking(
  input: CreateFlightBookingInput
): Promise<FlightCheckoutResult> {
  const response = await api.post<ApiResponse<FlightCheckoutResult>>("/bookings/flights", input);
  return response.data.data;
}
