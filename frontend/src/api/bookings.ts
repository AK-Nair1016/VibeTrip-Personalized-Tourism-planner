import { api, type ApiResponse } from "./axios";
import type {
  Booking,
  BookingDetail,
  BookingStatusInfo,
  CancelResult,
  CancellationQuote,
} from "../types/booking";

// Newest first. The backend hides failed and unpaid bookings from this list.
export async function fetchBookings(): Promise<Booking[]> {
  const response = await api.get<ApiResponse<Booking[]>>("/bookings");
  return response.data.data;
}

export async function fetchBooking(bookingId: string): Promise<BookingDetail> {
  const response = await api.get<ApiResponse<BookingDetail>>(`/bookings/${bookingId}`);
  return response.data.data;
}

// Cheap check for polling. It works for unpaid and failed bookings too.
export async function fetchBookingStatus(bookingId: string): Promise<BookingStatusInfo> {
  const response = await api.get<ApiResponse<BookingStatusInfo>>(`/bookings/${bookingId}/status`);
  return response.data.data;
}

// Flights only: asks what a cancel would refund, without cancelling
export async function createCancellationQuote(bookingId: string): Promise<CancellationQuote> {
  const response = await api.post<ApiResponse<CancellationQuote>>(`/bookings/${bookingId}/cancellation-quote`);
  return response.data.data;
}

export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  const response = await api.post<ApiResponse<CancelResult>>(`/bookings/${bookingId}/cancel`);
  return response.data.data;
}
