// A flight snapshot is saved with Duffel's own ids: the offer id (off_...), the order id
// (providerBookingId) and one passenger id (pas_...) per traveller. The backend needs them to
// book and cancel, but the traveller never does, so they are removed from what we send back.
// This only builds a copy for the response. The saved booking is never changed.
const FLIGHT_SNAPSHOT_PRIVATE_KEYS = ["offerId", "providerBookingId"];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripFlightSnapshot = (snapshot: Record<string, unknown>): Record<string, unknown> => {
  const copy: Record<string, unknown> = {};

  for (const key of Object.keys(snapshot)) {
    if (!FLIGHT_SNAPSHOT_PRIVATE_KEYS.includes(key)) {
      copy[key] = snapshot[key];
    }
  }

  // Travellers keep their name and contact details, but lose the Duffel passenger id
  if (Array.isArray(snapshot.passengers)) {
    const passengers: unknown[] = [];
    for (const passenger of snapshot.passengers) {
      if (!isPlainObject(passenger)) {
        passengers.push(passenger);
        continue;
      }
      const passengerCopy: Record<string, unknown> = {};
      for (const key of Object.keys(passenger)) {
        if (key !== "id") {
          passengerCopy[key] = passenger[key];
        }
      }
      passengers.push(passengerCopy);
    }
    copy.passengers = passengers;
  }

  return copy;
};

// Returns the booking with a safe snapshot. Hotel snapshots hold no provider ids and pass through unchanged.
export const withPublicSnapshot = <T extends { type?: string; snapshot?: unknown }>(booking: T): T => {
  if (booking.type !== "flight" || !isPlainObject(booking.snapshot)) {
    return booking;
  }

  return { ...booking, snapshot: stripFlightSnapshot(booking.snapshot) };
};
