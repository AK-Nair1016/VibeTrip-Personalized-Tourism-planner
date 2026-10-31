import type { Booking } from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";

export async function fetchBookings(): Promise<Booking[]> {
  const response = await api.get<ApiResponse<Booking[]>>("/bookings");
  // response.data is the envelope; the list is inside its own `data`
  return response.data.data;
}
