import { Link } from "react-router-dom";
import type { HotelCard } from "@vibetrip/shared-types";
import { defaultStay, stayToQueryString } from "./stayDates";
import HeartButton from "./HeartButton";
import { propertyTypeLabel } from "./hotelFormat";

interface WishlistCardProps {
  hotel: HotelCard;
  disabled: boolean;
  onRemove: () => void;
}

// One saved hotel. The saved list has no dates or prices, so "Check dates" opens the hotel
// with default dates and the visitor picks their own there.
export default function WishlistCard({ hotel, disabled, onRemove }: WishlistCardProps) {
  const detailLink = `/hotels/${hotel.id}?${stayToQueryString(defaultStay())}`;

  return (
    <article className="group flex flex-col">
      <div className="relative mb-3.5 aspect-square w-full overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container">
        <Link to={detailLink}>
          <img
            src={hotel.photo}
            alt={hotel.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>
        <div className="absolute right-3 top-3">
          <HeartButton saved={true} disabled={disabled} hotelName={hotel.name} onToggle={onRemove} />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="truncate font-title text-[17px] font-extrabold tracking-tight text-on-surface">{hotel.name}</h3>
          <div className="flex shrink-0 items-center gap-1 font-label-md text-label-md font-extrabold text-primary-container">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            <span className="tabular-nums">{hotel.reviewCount === 0 ? "New" : hotel.guestRating.toFixed(1)}</span>
          </div>
        </div>
        <p className="mb-4 font-body-sm text-[13.5px] text-on-surface-variant">
          {hotel.city} · {hotel.starRating}★ {propertyTypeLabel(hotel.propertyType).toLowerCase()}
        </p>
        <div className="mt-auto">
          <Link
            to={detailLink}
            className="block w-full rounded-xl border border-outline-variant/80 px-4 py-2 text-center font-label-md text-label-md font-semibold text-on-surface transition-colors duration-150 hover:border-primary-container hover:bg-secondary-container/20"
          >
            Check dates
          </Link>
        </div>
      </div>
    </article>
  );
}
