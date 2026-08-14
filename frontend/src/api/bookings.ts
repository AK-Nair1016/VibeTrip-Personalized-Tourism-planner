import type { Booking } from "@vibetrip/shared-types";
import { api } from "./axios";

export async function fetchBookings(): Promise<Booking[]> {
  const response = await api.get<Booking[]>("/bookings");
  return response.data;
}
