import type { FlightSlice, HotelBookingSnapshot, Money } from "@vibetrip/shared-types";

// The shared-types Booking is an old scaffold, so the booking shapes the API really returns live here.
// Only fields that GET /bookings sends are listed. The backend removes the Duffel ids (offer id, order id,
// passenger ids) from a flight snapshot before replying (utils/publicSnapshot.ts), so they are not typed here.
// A flight snapshot also carries the travellers' birth date, email and phone, which the UI does not show.

export type BookingStatus = "pending_payment" | "authorized" | "confirmed" | "failed" | "cancelled";

// "failed" on a fee or refund means the money step did not work and needs a manual fix
export type MoneyStepStatus = "pending" | "succeeded" | "failed";

export interface FlightPassenger {
  title: string;
  givenName: string;
  familyName: string;
}

export interface FlightBookingSnapshot {
  airline: string;
  slices: FlightSlice[];
  price: Money;
  expiresAt: string;
  passengers: FlightPassenger[];
}

// What Duffel says about a confirmed flight right now. Only on the detail call.
export interface FlightLiveStatus {
  availableActions: string[];
  cancelledAt: string | null;
  hasAirlineChanges: boolean;
  syncedAt: string;
}

interface BookingBase {
  _id: string;
  status: BookingStatus;
  // A flight has no reference until the airline order exists
  bookingReference?: string;
  // In the currency the user paid in. Always show these, never the snapshot price.
  totalAmount: number;
  currency: string;
  cancelledAt?: string;
  // Hotels: late fee owed to the hotel, in the booking currency
  cancellationFee?: number;
  cancellationFeeStatus?: MoneyStepStatus;
  // Flights: money returned after a cancel
  refundAmount?: number;
  refundCurrency?: string;
  refundStatus?: MoneyStepStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FlightBooking extends BookingBase {
  type: "flight";
  snapshot: FlightBookingSnapshot;
}

export interface HotelBooking extends BookingBase {
  type: "hotel";
  snapshot: HotelBookingSnapshot;
}

// Checking "type" narrows which snapshot you have
export type Booking = FlightBooking | HotelBooking;

// GET /bookings/:id: the same fields plus the live airline status (null for hotels)
export type BookingDetail = Booking & { liveStatus: FlightLiveStatus | null };

// GET /bookings/:id/status: the light check used while polling
export interface BookingStatusInfo {
  bookingId: string;
  status: BookingStatus;
  message: string;
  refundStatus: MoneyStepStatus | null;
}

// POST /bookings/:id/cancellation-quote (flights)
export interface CancellationQuote {
  bookingId: string;
  refundAmount: number;
  currency: string;
  expiresAt: string;
}

// POST /bookings/:id/cancel. Flights fill the refund fields, hotels fill the fee fields.
export interface CancelResult {
  bookingId: string;
  status: BookingStatus;
  refundAmount?: number;
  refundStatus?: MoneyStepStatus;
  cancellationFee?: number;
  cancellationFeeStatus?: MoneyStepStatus | null;
  currency: string;
}

// POST /bookings/hotels
export interface HotelBookingResult {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  totalAmount: number;
  currency: string;
}

// POST /bookings/hotels/card-setup
export interface CardSetup {
  setupIntentId: string;
  clientSecret: string;
}
