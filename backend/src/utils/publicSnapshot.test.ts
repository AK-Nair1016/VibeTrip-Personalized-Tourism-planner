import { test } from "node:test";
import assert from "node:assert/strict";
import { withPublicSnapshot } from "./publicSnapshot";

// Plain objects stand in for lean booking documents
const makeFlight = () => ({
  type: "flight",
  status: "confirmed",
  snapshot: {
    offerId: "off_123",
    airline: "Duffel Airways",
    slices: [{ origin: "DEL", destination: "LHR", segments: [] }],
    price: { amount: 100, currency: "EUR" },
    expiresAt: "2026-11-12T10:00:00Z",
    providerBookingId: "ord_999",
    bookingReference: "ABC123",
    passengers: [
      { id: "pas_1", title: "mr", givenName: "Aman", familyName: "Nair", email: "a@b.co" },
      { id: "pas_2", title: "ms", givenName: "Sara", familyName: "Nair", email: "s@b.co" },
    ],
  },
});

test("flight snapshot loses the offer id, the order id and the passenger ids", () => {
  const result = withPublicSnapshot(makeFlight());
  const snapshot = result.snapshot as Record<string, unknown>;

  assert.equal("offerId" in snapshot, false);
  assert.equal("providerBookingId" in snapshot, false);

  const passengers = snapshot.passengers as Record<string, unknown>[];
  assert.equal(passengers.length, 2);
  for (const passenger of passengers) {
    assert.equal("id" in passenger, false);
  }
});

test("flight snapshot keeps everything the page needs", () => {
  const result = withPublicSnapshot(makeFlight());
  const snapshot = result.snapshot as Record<string, unknown>;

  assert.equal(snapshot.airline, "Duffel Airways");
  assert.equal(snapshot.bookingReference, "ABC123");
  assert.deepEqual(snapshot.price, { amount: 100, currency: "EUR" });
  const passengers = snapshot.passengers as Record<string, unknown>[];
  assert.equal(passengers[0].givenName, "Aman");
  assert.equal(passengers[1].familyName, "Nair");
});

test("does not mutate the saved booking", () => {
  const flight = makeFlight();
  withPublicSnapshot(flight);

  assert.equal(flight.snapshot.offerId, "off_123");
  assert.equal(flight.snapshot.providerBookingId, "ord_999");
  assert.equal(flight.snapshot.passengers[0].id, "pas_1");
});

test("hotel snapshot passes through unchanged", () => {
  const hotel = { type: "hotel", snapshot: { hotelId: "h1", roomId: "r1", hotelName: "Lumiere" } };
  const result = withPublicSnapshot(hotel);

  assert.equal(result, hotel);
  assert.deepEqual(result.snapshot, { hotelId: "h1", roomId: "r1", hotelName: "Lumiere" });
});

test("a flight with a missing or odd snapshot is returned as is", () => {
  const noSnapshot = { type: "flight" };
  assert.equal(withPublicSnapshot(noSnapshot), noSnapshot);

  const oddPassengers = { type: "flight", snapshot: { passengers: "none" } };
  const result = withPublicSnapshot(oddPassengers);
  assert.deepEqual(result.snapshot, { passengers: "none" });
});
