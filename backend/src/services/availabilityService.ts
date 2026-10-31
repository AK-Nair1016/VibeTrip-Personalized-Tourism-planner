import type { HotelBookingSnapshot } from "@vibetrip/shared-types";
import { Booking } from "../models/Booking";
import { listNights } from "../utils/stayDates";

export interface RoomCapacity {
  roomId: string;
  totalRooms: number;
}

// Rooms still free on EVERY night of the stay, for each room type given: roomId -> rooms left.
//
// Counted night by night: rooms left = totalRooms - the busiest night of the stay.
// "Live" = a confirmed hotel booking.
// The answer can be negative: checkout recounts after saving its own booking, and below 0 means
// two travellers took the last room at the same moment.
export const getRoomsLeft = async (
  capacities: RoomCapacity[],
  checkIn: string,
  checkOut: string
): Promise<Map<string, number>> => {
  const roomsLeft = new Map<string, number>();

  if (capacities.length === 0) {
    return roomsLeft;
  }

  const roomIds: string[] = [];
  for (const capacity of capacities) {
    roomIds.push(capacity.roomId);
  }

  // A stay overlaps ours when it starts before we leave and ends after we arrive.
  // The dates are YYYY-MM-DD text, which sorts in date order.
  const bookings = await Booking.find({
    type: "hotel",
    status: "confirmed",
    isLive: true,
    "snapshot.roomId": { $in: roomIds },
    "snapshot.checkIn": { $lt: checkOut },
    "snapshot.checkOut": { $gt: checkIn },
  })
    .select("snapshot.roomId snapshot.checkIn snapshot.checkOut snapshot.rooms")
    .lean();

  const nights = listNights(checkIn, checkOut);

  for (const capacity of capacities) {
    let busiestNight = 0;

    for (const night of nights) {
      let bookedThatNight = 0;

      for (const booking of bookings) {
        const snapshot = booking.snapshot as HotelBookingSnapshot;

        // The check-out day is not a night of that stay, so it is "<", not "<="
        const coversNight =
          snapshot.roomId === capacity.roomId && snapshot.checkIn <= night && night < snapshot.checkOut;

        if (coversNight) {
          bookedThatNight += snapshot.rooms;
        }
      }

      if (bookedThatNight > busiestNight) {
        busiestNight = bookedThatNight;
      }
    }

    roomsLeft.set(capacity.roomId, capacity.totalRooms - busiestNight);
  }

  return roomsLeft;
};
