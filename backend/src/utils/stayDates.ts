const DAY_MS = 24 * 60 * 60 * 1000;

// Both arguments must already be valid YYYY-MM-DD text (isDateString checks that).
// Date.parse reads such text as midnight UTC, so the gap is always a whole number of days.
export const countNights = (checkIn: string, checkOut: string): number => {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / DAY_MS);
};

// "2027-03-01" + 2 -> "2027-03-03"
export const addDays = (date: string, days: number): string => {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
};

// Every night of a stay: check-in 03-01, check-out 03-04 -> ["03-01", "03-02", "03-03"].
// The check-out day is not a night: that room is free again that evening.
export const listNights = (checkIn: string, checkOut: string): string[] => {
  const nights: string[] = [];
  const total = countNights(checkIn, checkOut);

  for (let i = 0; i < total; i++) {
    nights.push(addDays(checkIn, i));
  }

  return nights;
};

// Cancelling online is free until this moment; after it a late fee applies. Check-in counts from 00:00 UTC
// of the check-in day, so "48 hours before" is the same instant for every traveller.
export const freeCancelUntil = (checkIn: string, hours: number): string => {
  return new Date(Date.parse(checkIn) - hours * 60 * 60 * 1000).toISOString();
};
