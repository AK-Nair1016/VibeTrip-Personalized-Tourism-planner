import type { FlightOffer } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";
import FlightSliceRow from "./FlightSliceRow";
import { adultsLabel, formatDay } from "./flightFormat";

interface FlightOfferCardProps {
  offer: FlightOffer;
  adults: number;
  onSelect: (offer: FlightOffer) => void;
}

// One result card. Left: the trip. Right: the total price and the Select button.
export default function FlightOfferCard({ offer, adults, onSelect }: FlightOfferCardProps) {
  const isRoundTrip = offer.slices.length > 1;

  return (
    <div className="flex flex-col items-stretch overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md md:flex-row">
      <div className="flex flex-1 flex-col gap-space-lg p-5">
        {offer.slices.map((slice, index) => {
          const day = formatDay(slice.segments[0].departingAt);
          let label = day;
          if (isRoundTrip) {
            label = `${index === 0 ? "Outbound" : "Return"} · ${day}`;
          }
          return <FlightSliceRow key={index} slice={slice} label={label} />;
        })}
      </div>

      <div className="flex w-full shrink-0 flex-col items-end justify-center bg-surface-container-low p-5 text-right md:w-[210px]">
        <span className="text-label-sm text-outline">Total fare</span>
        <div className="text-headline-md tracking-tight text-on-surface">
          {formatMoney(offer.price.amount, offer.price.currency)}
        </div>
        {/* The price covers every traveller on the search, not one adult */}
        <span className="mb-3 text-label-sm text-outline">for {adultsLabel(adults)}</span>
        <button
          type="button"
          onClick={() => onSelect(offer)}
          className="w-full rounded-lg bg-primary-container px-6 py-2.5 text-center text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary"
        >
          Select
        </button>
      </div>
    </div>
  );
}
