import { useState } from "react";
import type { Hotel, RoomOffer } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";
import { formatInstant, formatStayDate } from "../bookings/bookingFormat";

interface HotelStaySummaryProps {
  hotel: Hotel;
  room: RoomOffer;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  guests: number;
}

// The left column of the hotel checkout: the hotel, the stay details and the price.
// Every number here comes from the server (hotel and room offer); nothing is typed by the user.
export default function HotelStaySummary(props: HotelStaySummaryProps) {
  const { hotel, room, checkIn, checkOut, nights, rooms, guests } = props;
  const [photoFailed, setPhotoFailed] = useState(false);

  const photo = hotel.photos[0];
  const nightWord = nights === 1 ? "night" : "nights";
  const roomWord = rooms === 1 ? "room" : "rooms";
  const guestWord = guests === 1 ? "guest" : "guests";
  const perNight = formatMoney(room.pricePerNight.amount, room.pricePerNight.currency);

  // "9,800.00 x 3 nights" or "9,800.00 x 3 nights x 2 rooms"
  let priceLine = `${perNight} × ${nights} ${nightWord}`;
  if (rooms > 1) {
    priceLine = `${priceLine} × ${rooms} ${roomWord}`;
  }

  return (
    <aside className="order-2 flex flex-col gap-5 lg:order-1 lg:col-span-4 lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        {photo && !photoFailed && (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-container">
            <img
              src={photo}
              alt={hotel.name}
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-surface-container-lowest/95 px-2.5 py-1 font-label-sm text-label-sm font-bold text-on-surface shadow-sm">
              <span className="material-symbols-outlined text-[14px] text-primary-container">location_on</span>
              {hotel.city}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-1 font-label-sm text-label-sm font-semibold uppercase tracking-widest text-tertiary-container">
            <span>{"★".repeat(hotel.starRating)}</span>
            <span className="ml-1 font-medium lowercase tracking-normal text-on-surface-variant">
              {hotel.propertyType}
            </span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm font-extrabold tracking-tight text-on-surface">
              {hotel.name}
            </h2>
            <p className="mt-1 font-body-sm text-body-sm leading-snug text-on-surface-variant">{hotel.address}</p>
          </div>
          {hotel.reviewCount > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <div className="rounded-t-lg rounded-br-lg bg-[#134E4A] px-2.5 py-1 font-price-tabular text-[15px] font-extrabold text-on-primary">
                {hotel.guestRating.toFixed(1)}
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {hotel.reviewCount} review{hotel.reviewCount === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-title text-title font-bold text-on-surface">Your booking details</h3>
          <span className="material-symbols-outlined text-[20px] text-primary-container">calendar_today</span>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
            <span className="mb-0.5 block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Check-in
            </span>
            <span className="block text-[16px] font-extrabold leading-snug text-on-surface">
              {formatStayDate(checkIn)}
            </span>
          </div>
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
            <span className="mb-0.5 block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Check-out
            </span>
            <span className="block text-[16px] font-extrabold leading-snug text-on-surface">
              {formatStayDate(checkOut)}
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 border-t border-outline-variant pt-3 font-body-sm text-body-sm font-medium text-on-surface">
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">bed</span>
            {nights} {nightWord} · {room.type}
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">group</span>
            {guests} {guestWord} · {rooms} {roomWord}
          </li>
        </ul>
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="p-5 pb-4">
          <h3 className="mb-3 font-title text-title font-bold text-on-surface">Price summary</h3>
          <div className="flex items-center justify-between gap-3 font-body-sm text-body-sm text-on-surface">
            <span>{priceLine}</span>
            <span className="font-price-tabular text-[16px]">{formatMoney(room.total.amount, room.total.currency)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant bg-[#E6F4F2] px-5 py-4">
          <span className="font-title text-title font-extrabold leading-none text-on-surface">Total</span>
          <div className="text-right">
            <span className="block font-price-tabular text-[26px] font-extrabold leading-none text-primary">
              {formatMoney(room.total.amount, room.total.currency)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Pay when you stay</span>
          </div>
        </div>
        <div className="border-t border-outline-variant p-5 font-label-sm text-label-sm text-on-surface-variant">
          Free cancellation until {formatInstant(room.freeCancelUntil)}. After that, a late fee of{" "}
          <strong className="text-on-surface">
            {formatMoney(room.lateCancelFee.amount, room.lateCancelFee.currency)}
          </strong>{" "}
          applies.
        </div>
      </div>
    </aside>
  );
}
