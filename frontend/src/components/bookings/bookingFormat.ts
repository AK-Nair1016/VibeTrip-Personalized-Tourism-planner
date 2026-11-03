import type { Booking, BookingStatus } from "../../types/booking";

// A stay date is plain text like "2026-11-12". new Date() reads it as midnight UTC, so it must be
// shown in UTC too, or people west of Greenwich would see the day before.
export function formatStayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// A real moment in time (for example freeCancelUntil). Shown in the visitor's own timezone, and the
// timezone name is printed so nobody has to guess.
export function formatInstant(isoInstant: string): string {
  const date = new Date(isoInstant);
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// When the booking was made
export function formatCreatedAt(isoInstant: string): string {
  return new Date(isoInstant).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Flight times look like "2026-11-12T02:15:00": local time at the airport, no timezone.
// Converting would move the clock, so the text is cut instead.
export function flightLocalDate(localDateTime: string): string {
  return formatStayDate(localDateTime.slice(0, 10));
}

export function flightLocalTime(localDateTime: string): string {
  return localDateTime.slice(11, 16);
}

// "PT2H10M" -> "2h 10m"
export function formatDuration(isoDuration: string): string {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(isoDuration);
  if (!match) {
    return isoDuration;
  }
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0) + days * 24;
  const minutes = Number(match[3] ?? 0);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  return parts.join(" ");
}

// Today as YYYY-MM-DD in UTC: the same clock the server uses for its own stay checks
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatRoute(booking: Booking): string {
  if (booking.type === "hotel") {
    return booking.snapshot.hotelName;
  }
  const slices = booking.snapshot.slices;
  if (slices.length === 0) {
    return "Flight";
  }
  const first = slices[0];
  return `${first.origin} to ${first.destination}`;
}

// The date shown on a card: check-in for a stay, first takeoff for a flight
export function bookingStartDate(booking: Booking): string {
  if (booking.type === "hotel") {
    return formatStayDate(booking.snapshot.checkIn);
  }
  const firstSegment = booking.snapshot.slices[0]?.segments[0];
  if (!firstSegment) {
    return "";
  }
  return flightLocalDate(firstSegment.departingAt);
}

// Upcoming means the trip still has something ahead. A stay is upcoming until its check-out day
// (the same rule the server uses for the 5-booking limit). A flight is upcoming until its last takeoff.
export function isUpcoming(booking: Booking): boolean {
  const today = todayUtc();

  if (booking.type === "hotel") {
    return booking.snapshot.checkOut > today;
  }

  const slices = booking.snapshot.slices;
  const lastSlice = slices[slices.length - 1];
  const lastTakeoff = lastSlice?.segments[0]?.departingAt;
  if (!lastTakeoff) {
    return false;
  }
  return lastTakeoff.slice(0, 10) >= today;
}

// Label and colours for the small status pill
export function statusPill(status: BookingStatus): { label: string; className: string } {
  if (status === "confirmed") {
    return { label: "Confirmed", className: "bg-[#E6F4F2] text-primary-container" };
  }
  if (status === "authorized") {
    return { label: "Confirming", className: "bg-[#FFF7E6] text-[#B45309]" };
  }
  if (status === "pending_payment") {
    return { label: "Awaiting payment", className: "bg-[#FFF7E6] text-[#B45309]" };
  }
  if (status === "failed") {
    return { label: "Not completed", className: "bg-error-container text-on-error-container" };
  }
  return { label: "Cancelled", className: "bg-surface-container text-on-surface-variant" };
}
