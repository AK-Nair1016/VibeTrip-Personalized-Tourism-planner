// Dates travel as YYYY-MM-DD text (the format the backend and <input type="date"> both use).
// The backend judges every date against the UTC calendar day (its "today" is
// new Date().toISOString().slice(0, 10)), so we do the same: a local "today" could be a day
// ahead or behind the server's and offer a date it rejects.

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Reads "2026-11-12" as UTC midnight, which is what Date does with this format anyway.
function fromIsoDate(isoDate: string): Date {
  return new Date(Date.parse(isoDate));
}

export function addDays(isoDate: string, days: number): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return toIsoDate(new Date(Date.parse(isoDate) + days * millisecondsPerDay));
}

export function today(): string {
  return toIsoDate(new Date());
}

export function countNights(checkIn: string, checkOut: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / millisecondsPerDay);
}

// "12 Nov 2026" for display. timeZone UTC so the day shown is the day typed, whatever the visitor's zone.
export function formatDate(isoDate: string): string {
  return fromIsoDate(isoDate).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

// A stay to prefill when the user has not chosen dates yet: two weeks out, three nights.
export interface StayQuery {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export function defaultStay(): StayQuery {
  const checkIn = addDays(today(), 14);
  return { checkIn, checkOut: addDays(checkIn, 3), guests: 2, rooms: 1 };
}

// Limits the backend enforces (HOTEL_LIMITS). The form uses them to avoid pointless 422s.
export const STAY_LIMITS = { maxGuests: 8, maxRooms: 4, maxNights: 30, maxDaysAhead: 365 } as const;

// Turns a stay into the query string the hotel pages read.
export function stayToQueryString(stay: StayQuery): string {
  const params = new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    guests: String(stay.guests),
    rooms: String(stay.rooms)
  });
  return params.toString();
}

// Reads a whole number out of a query value, or uses the fallback when it is missing or wrong.
export function readNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}
