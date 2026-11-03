import { Link } from "react-router-dom";
import type { RoomOffer } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";
import { amenityIcon } from "./hotelFormat";
import type { StayQuery } from "./stayDates";

interface RoomListProps {
  hotelId: string;
  rooms: RoomOffer[];
  loading: boolean;
  error: string;
  stay: StayQuery;
  nights: number;
  onRetry: () => void;
}

// "10 Nov, 14:00" in the visitor's own time zone
function formatCancelTime(isoTime: string): string {
  return new Date(isoTime).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// The room types that are free for the whole stay. The page re-fetches this when dates, guests or currency change.
export default function RoomList({ hotelId, rooms, loading, error, stay, nights, onRetry }: RoomListProps) {
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-outline-variant p-space-lg text-center">
        <p className="mb-4 font-body-default text-body-default text-on-surface">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[12px] bg-primary-container px-6 py-2.5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading && rooms.length === 0) {
    return (
      <div className="flex flex-col gap-space-md" aria-busy="true">
        {[0, 1].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-surface-container-high" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant p-space-lg text-center">
        <span className="material-symbols-outlined mb-2 text-[36px] text-outline">hotel</span>
        <p className="font-title text-title text-on-surface">No rooms available</p>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Nothing is free for these dates and guests. Try other dates, fewer rooms or fewer guests.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`divide-y divide-outline-variant/60 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest transition-opacity ${
        loading ? "opacity-60" : ""
      }`}
    >
      {rooms.map((room) => {
        const reserveParams = new URLSearchParams({
          hotelId,
          roomId: room.roomId,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          rooms: String(stay.rooms),
          guests: String(stay.guests)
        });

        // The free-cancel time can already be past when check-in is close
        const freeCancelOpen = new Date(room.freeCancelUntil).getTime() > Date.now();

        return (
          <div
            key={room.roomId}
            className="flex flex-col justify-between gap-space-md p-space-md md:flex-row md:items-center"
          >
            <div className="flex min-w-0 flex-1 gap-space-md">
              {room.photos.length > 0 ? (
                <img
                  src={room.photos[0]}
                  alt={room.type}
                  loading="lazy"
                  className="hidden h-20 w-28 shrink-0 rounded-lg object-cover sm:block"
                />
              ) : null}
              <div className="min-w-0">
                <h3 className="font-title text-title text-primary-container">{room.type}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Up to {room.maxGuests} guests</p>
                {room.amenities.length > 0 ? (
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {room.amenities.map((amenity) => (
                      <li key={amenity} className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">{amenityIcon(amenity)}</span>
                        {amenity}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-1 md:w-60">
              {freeCancelOpen ? (
                <>
                  <div className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-[#00803A]">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Free cancellation until {formatCancelTime(room.freeCancelUntil)}</span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    After that, a late cancellation fee of{" "}
                    {formatMoney(room.lateCancelFee.amount, room.lateCancelFee.currency)} applies.
                  </p>
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>
                    Free cancellation has ended. Cancelling now costs{" "}
                    {formatMoney(room.lateCancelFee.amount, room.lateCancelFee.currency)}.
                  </span>
                </div>
              )}
              <div
                className={`inline-flex items-center gap-1.5 font-label-sm text-label-sm ${
                  room.roomsLeft <= 3 ? "font-semibold text-[#B45309]" : "text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{room.roomsLeft <= 3 ? "bolt" : "meeting_room"}</span>
                <span>
                  {room.roomsLeft <= 3 ? "Only " : ""}
                  {room.roomsLeft} {room.roomsLeft === 1 ? "room" : "rooms"} left
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-space-sm md:flex-col md:items-end">
              <div className="flex flex-col md:items-end">
                <span className="font-price-tabular text-price-tabular text-on-surface">
                  {formatMoney(room.total.amount, room.total.currency)}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {formatMoney(room.pricePerNight.amount, room.pricePerNight.currency)} / night · {nights}{" "}
                  {nights === 1 ? "night" : "nights"}
                </span>
              </div>
              <Link
                to={`/checkout/hotel?${reserveParams.toString()}`}
                className="rounded-[10px] bg-primary-container px-5 py-2 font-label-md text-label-md text-on-primary transition-colors hover:bg-primary"
              >
                Reserve
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
