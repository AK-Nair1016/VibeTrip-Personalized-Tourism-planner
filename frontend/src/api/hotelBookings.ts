import type { CurrencyCode } from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";
import type { CardSetup, HotelBookingResult } from "../types/booking";

// What the checkout form sends. There is no price field: the server prices the room itself.
export interface CreateHotelBookingInput {
  hotelId: string;
  roomId: string;
  setupIntentId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  leadGuest: { givenName: string; familyName: string };
  email: string;
  phoneNumber: string;
  currency: CurrencyCode;
}

// Step 1: ask the server to start saving a card. Nothing is charged.
// TODO(stripe): CardGuaranteeSection will call this, then confirmCardSetup(clientSecret) with Stripe.js.
export async function createHotelCardSetup(): Promise<CardSetup> {
  const response = await api.post<ApiResponse<CardSetup>>("/bookings/hotels/card-setup");
  return response.data.data;
}

// Step 2: book the room once the card is saved
export async function createHotelBooking(input: CreateHotelBookingInput): Promise<HotelBookingResult> {
  const response = await api.post<ApiResponse<HotelBookingResult>>("/bookings/hotels", input);
  return response.data.data;
}
