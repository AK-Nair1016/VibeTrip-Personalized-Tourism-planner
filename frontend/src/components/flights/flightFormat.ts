import type { CabinClass, FlightOffer, FlightSlice } from "@vibetrip/shared-types";

// The 10 cities we support. LON, PAR, NYC and TYO are city codes that cover all airports there.
// Kept here (not imported from the backend) because the frontend cannot reach backend code.
export const FLIGHT_CITIES = [
  { code: "DEL", name: "Delhi" },
  { code: "BOM", name: "Mumbai" },
  { code: "BLR", name: "Bengaluru" },
  { code: "DXB", name: "Dubai" },
  { code: "LON", name: "London" },
  { code: "PAR", name: "Paris" },
  { code: "NYC", name: "New York" },
  { code: "SIN", name: "Singapore" },
  { code: "TYO", name: "Tokyo" },
  { code: "BKK", name: "Bangkok" }
];

export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  premium_economy: "Premium economy",
  business: "Business",
  first: "First"
};

// An airport code with no match (a stopover like AUH) is shown as the code itself.
export function cityName(code: string): string {
  for (const city of FLIGHT_CITIES) {
    if (city.code === code) {
      return city.name;
    }
  }
  return code;
}

export function adultsLabel(adults: number): string {
  if (adults === 1) {
    return "1 adult";
  }
  return `${adults} adults`;
}

// Today as YYYY-MM-DD in the user's own timezone (for the date inputs' "min").
export function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// The times from the API are local airport times with no timezone ("2026-11-12T02:15:00").
// Reading them as text avoids new Date(), which would shift them into the browser's timezone.
export function formatTime(localIso: string): string {
  return localIso.slice(11, 16);
}

export function hourOf(localIso: string): number {
  return Number(localIso.slice(11, 13));
}

// "2026-11-12..." -> "Thu 12 Nov". The date is built in UTC and printed in UTC so nothing shifts.
export function formatDay(localIso: string): string {
  const year = Number(localIso.slice(0, 4));
  const month = Number(localIso.slice(5, 7));
  const day = Number(localIso.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  });
}

// How many calendar days later the plane lands (the mock's "+1" badge).
export function dayOffset(departingAt: string, arrivingAt: string): number {
  const departDay = Date.UTC(
    Number(departingAt.slice(0, 4)),
    Number(departingAt.slice(5, 7)) - 1,
    Number(departingAt.slice(8, 10))
  );
  const arriveDay = Date.UTC(
    Number(arrivingAt.slice(0, 4)),
    Number(arrivingAt.slice(5, 7)) - 1,
    Number(arrivingAt.slice(8, 10))
  );
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((arriveDay - departDay) / millisecondsPerDay);
}

// Duffel durations are ISO 8601 and may include days: "PT2H10M", "P1DT2H30M".
export function parseDurationMinutes(isoDuration: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(isoDuration);
  if (!match) {
    return 0;
  }

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return days * 24 * 60 + hours * 60 + minutes;
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatSliceDuration(slice: FlightSlice): string {
  return formatMinutes(parseDurationMinutes(slice.duration));
}

// A return trip is as long as its longest leg for the stops filter, and the sum for "fastest".
export function offerStops(offer: FlightOffer): number {
  let most = 0;
  for (const slice of offer.slices) {
    if (slice.stops > most) {
      most = slice.stops;
    }
  }
  return most;
}

export function offerMinutes(offer: FlightOffer): number {
  let total = 0;
  for (const slice of offer.slices) {
    total += parseDurationMinutes(slice.duration);
  }
  return total;
}

// "ZZ 1234" -> "ZZ". Used for the little airline circle instead of a logo image.
export function airlineCode(flightNumber: string): string {
  return flightNumber.split(" ")[0];
}

// Colours for the airline circle. Full class names (not built from pieces) so Tailwind keeps them.
const CIRCLE_COLOURS = [
  "bg-error-container text-error",
  "bg-secondary-fixed text-secondary",
  "bg-tertiary-fixed text-tertiary",
  "bg-surface-container-high text-on-surface",
  "bg-secondary-container text-on-secondary-container"
];

// The same airline always gets the same colour.
export function circleColour(code: string): string {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    sum += code.charCodeAt(i);
  }
  return CIRCLE_COLOURS[sum % CIRCLE_COLOURS.length];
}

// "Non-stop" or "1 stop DXB". The stop airports are where each flight except the last one lands.
export function stopsLabel(slice: FlightSlice): string {
  if (slice.stops === 0) {
    return "Non-stop";
  }

  const stopCodes: string[] = [];
  for (let i = 0; i < slice.segments.length - 1; i++) {
    stopCodes.push(slice.segments[i].destination);
  }

  const noun = slice.stops === 1 ? "stop" : "stops";
  return `${slice.stops} ${noun} ${stopCodes.join(", ")}`;
}

// The route as a title: "Delhi to London".
export function routeTitle(offer: FlightOffer): string {
  const first = offer.slices[0];
  return `${cityName(first.origin)} to ${cityName(first.destination)}`;
}
