import { useState } from "react";
import type { HotelBooking } from "../../types/booking";
import { formatInstant, formatStayDate } from "./bookingFormat";
import { formatMoney } from "../../utils/formatMoney";

// The stay part of a hotel booking page: where, when, which room, who.
export default function HotelSummary({ booking }: { booking: HotelBooking }) {
  const snapshot = booking.snapshot;
  const [photoFailed, setPhotoFailed] = useState(false);
  const nightWord = snapshot.nights === 1 ? "night" : "nights";
  const guestWord = snapshot.guests === 1 ? "guest" : "guests";
  const roomWord = snapshot.rooms === 1 ? "room" : "rooms";

  return (
    <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      {snapshot.photo && !photoFailed && (
        <img
          src={snapshot.photo}
          alt={snapshot.hotelName}
          onError={() => setPhotoFailed(true)}
          className="aspect-[16/7] w-full object-cover"
        />
      )}

      <div className="space-y-space-md p-space-lg">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{snapshot.hotelName}</h2>
          <p className="mt-space-xs flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary-container">location_on</span>
            {snapshot.city}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
            <span className="mb-0.5 block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Check-in
            </span>
            <span className="block font-title text-title text-on-surface">{formatStayDate(snapshot.checkIn)}</span>
          </div>
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
            <span className="mb-0.5 block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Check-out
            </span>
            <span className="block font-title text-title text-on-surface">{formatStayDate(snapshot.checkOut)}</span>
          </div>
        </div>

        <ul className="space-y-space-sm border-t border-outline-variant pt-space-md font-body-sm text-body-sm text-on-surface">
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">bed</span>
            {snapshot.nights} {nightWord} · {snapshot.roomType} · {snapshot.rooms} {roomWord}
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">group</span>
            {snapshot.guests} {guestWord}
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
            Lead guest: {snapshot.leadGuest.givenName} {snapshot.leadGuest.familyName}
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">event_available</span>
            Free cancellation until {formatInstant(snapshot.freeCancelUntil)}. After that, a late fee of{" "}
            {formatMoney(snapshot.lateCancelFee.amount, snapshot.lateCancelFee.currency)} applies.
          </li>
        </ul>
      </div>
    </div>
  );
}
