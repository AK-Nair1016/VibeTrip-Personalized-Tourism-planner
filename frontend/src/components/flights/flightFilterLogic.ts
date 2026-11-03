import type { FlightOffer } from "@vibetrip/shared-types";
import { hourOf, offerMinutes, offerStops } from "./flightFormat";

// Filters and sorting run in the browser over the offers the API returned (up to 50 cheapest).
// An empty list for a filter means "no restriction".
export interface FlightFilterState {
  stops: number[]; // 0 = non-stop, 1 = one stop
  times: string[]; // ids from DEPARTURE_SLOTS
  airlines: string[];
}

export const EMPTY_FILTERS: FlightFilterState = { stops: [], times: [], airlines: [] };

export interface DepartureSlot {
  id: string;
  label: string;
  range: string;
  fromHour: number; // inclusive
  toHour: number; // exclusive
}

export const DEPARTURE_SLOTS: DepartureSlot[] = [
  { id: "early", label: "Early", range: "00:00 - 06:00", fromHour: 0, toHour: 6 },
  { id: "morning", label: "Morning", range: "06:00 - 12:00", fromHour: 6, toHour: 12 },
  { id: "afternoon", label: "Afternoon", range: "12:00 - 18:00", fromHour: 12, toHour: 18 },
  { id: "evening", label: "Evening", range: "18:00 - 24:00", fromHour: 18, toHour: 24 }
];

export type SortTab = "best" | "cheapest" | "fastest";

// The search asks the backend for at most 1 connection per direction, so 0 and 1 are the only
// real values. Anything higher would share the last bucket.
export function stopsBucket(offer: FlightOffer): number {
  return Math.min(offerStops(offer), 1);
}

// The departure-time filter looks at when the first flight takes off.
function departureSlotId(offer: FlightOffer): string {
  const hour = hourOf(offer.slices[0].segments[0].departingAt);
  for (const slot of DEPARTURE_SLOTS) {
    if (hour >= slot.fromHour && hour < slot.toHour) {
      return slot.id;
    }
  }
  return "early";
}

export function hasActiveFilters(filters: FlightFilterState): boolean {
  return filters.stops.length > 0 || filters.times.length > 0 || filters.airlines.length > 0;
}

export function applyFilters(offers: FlightOffer[], filters: FlightFilterState): FlightOffer[] {
  const kept: FlightOffer[] = [];

  for (const offer of offers) {
    if (filters.stops.length > 0 && !filters.stops.includes(stopsBucket(offer))) {
      continue;
    }
    if (filters.times.length > 0 && !filters.times.includes(departureSlotId(offer))) {
      continue;
    }
    if (filters.airlines.length > 0 && !filters.airlines.includes(offer.airline)) {
      continue;
    }
    kept.push(offer);
  }

  return kept;
}

// "Best" mixes price and trip length: each is scaled 0 to 1 within the list, then added.
// The lowest sum wins. It is a simple blend, not a real ranking algorithm.
export function sortOffers(offers: FlightOffer[], tab: SortTab): FlightOffer[] {
  const sorted = [...offers];
  if (sorted.length === 0) {
    return sorted;
  }

  if (tab === "cheapest") {
    sorted.sort((a, b) => a.price.amount - b.price.amount);
    return sorted;
  }

  if (tab === "fastest") {
    sorted.sort((a, b) => offerMinutes(a) - offerMinutes(b));
    return sorted;
  }

  let lowestPrice = sorted[0].price.amount;
  let highestPrice = lowestPrice;
  let shortest = offerMinutes(sorted[0]);
  let longest = shortest;
  for (const offer of sorted) {
    lowestPrice = Math.min(lowestPrice, offer.price.amount);
    highestPrice = Math.max(highestPrice, offer.price.amount);
    shortest = Math.min(shortest, offerMinutes(offer));
    longest = Math.max(longest, offerMinutes(offer));
  }

  // If every offer has the same price (or length) the range is 0, so avoid dividing by zero
  const priceRange = Math.max(highestPrice - lowestPrice, 1);
  const timeRange = Math.max(longest - shortest, 1);

  function score(offer: FlightOffer): number {
    const pricePart = (offer.price.amount - lowestPrice) / priceRange;
    const timePart = (offerMinutes(offer) - shortest) / timeRange;
    return pricePart + timePart;
  }

  sorted.sort((a, b) => score(a) - score(b));
  return sorted;
}
