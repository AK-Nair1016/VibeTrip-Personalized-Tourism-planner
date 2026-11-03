import { Link } from "react-router-dom";
import type { HotelSummary } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";
import HeartButton from "./HeartButton";
import { propertyTypeLabel, ratingLabel, starsText } from "./hotelFormat";

interface HotelResultCardProps {
  hotel: HotelSummary;
  // The part of the URL that carries the dates, so the detail page opens with the same stay
  stayQuery: string;
  saved: boolean;
  canToggle: boolean;
  onToggle: () => void;
}

// One row in the search results.
export default function HotelResultCard({ hotel, stayQuery, saved, canToggle, onToggle }: HotelResultCardProps) {
  const nightsText = hotel.nights === 1 ? "1 night" : `${hotel.nights} nights`;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-outline-variant/80 bg-surface-container-lowest transition hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
      <Link to={`/hotels/${hotel.id}?${stayQuery}`} className="flex flex-col sm:flex-row">
        <div className="h-52 w-full shrink-0 overflow-hidden bg-surface-container sm:h-auto sm:w-64">
          <img src={hotel.photo} alt={hotel.name} loading="lazy" className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-1 flex-col justify-between gap-space-md p-space-md sm:flex-row">
          <div className="min-w-0">
            <h2 className="truncate font-title text-title text-on-surface">{hotel.name}</h2>
            <p className="mt-0.5 font-body-sm text-label-sm text-on-surface-variant">
              <span className="text-amber-600">{starsText(hotel.starRating)}</span> {propertyTypeLabel(hotel.propertyType)}{" "}
              · {hotel.city}
            </p>
            <div className="mt-space-sm flex items-center gap-2">
              <span className="rounded-t-lg rounded-br-lg bg-[#134E4A] px-2 py-1 font-label-md text-label-md text-on-primary">
                {hotel.reviewCount === 0 ? "New" : hotel.guestRating.toFixed(1)}
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                {ratingLabel(hotel.guestRating, hotel.reviewCount)}
              </span>
              {hotel.reviewCount > 0 ? (
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {hotel.reviewCount} {hotel.reviewCount === 1 ? "review" : "reviews"}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col sm:items-end sm:justify-end sm:text-right">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {formatMoney(hotel.lowestPricePerNight.amount, hotel.lowestPricePerNight.currency)} / night
            </span>
            <span className="font-price-tabular text-price-tabular text-on-surface">
              {formatMoney(hotel.lowestTotal.amount, hotel.lowestTotal.currency)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              for {nightsText}, includes taxes and fees
            </span>
          </div>
        </div>
      </Link>

      {/* Outside the link's text flow, on top of the photo */}
      <div className="absolute left-3 top-3">
        <HeartButton saved={saved} disabled={!canToggle} hotelName={hotel.name} onToggle={onToggle} />
      </div>
    </article>
  );
}
