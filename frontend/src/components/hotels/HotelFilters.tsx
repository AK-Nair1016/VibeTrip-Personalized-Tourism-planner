import type { HotelSort } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";

// The sorts the backend supports (HOTEL_SORTS), with the wording from the mock.
const SORT_OPTIONS: { value: HotelSort; label: string }[] = [
  { value: "price_asc", label: "Price, lowest first" },
  { value: "price_desc", label: "Price, highest first" },
  { value: "rating", label: "Guest rating, high to low" },
  { value: "stars", label: "Star rating, high to low" }
];

const STAR_CHOICES = [1, 2, 3, 4, 5];

interface HotelFiltersProps {
  currency: string;
  // Top of the price slider, taken from the results. Null until the first results arrive.
  priceCeiling: number | null;
  priceStep: number;
  maxPrice: number | null; // null = no limit
  minStars: number | null; // null = any
  sort: HotelSort;
  onMaxPriceChange: (value: number | null) => void;
  onMinStarsChange: (value: number | null) => void;
  onSortChange: (value: HotelSort) => void;
  onClear: () => void;
}

// The left column: budget slider, star pills, sort dropdown.
export default function HotelFilters(props: HotelFiltersProps) {
  const { currency, priceCeiling, priceStep, maxPrice, minStars, sort } = props;

  // The slider sits at the right end when no limit is set
  const sliderValue = maxPrice !== null && priceCeiling !== null ? maxPrice : (priceCeiling ?? 0);
  const budgetLabel = maxPrice === null ? "No limit" : formatMoney(maxPrice, currency);

  function handleSliderChange(value: number) {
    // All the way right means "no limit", so we stop sending maxPrice
    if (priceCeiling !== null && value >= priceCeiling) {
      props.onMaxPriceChange(null);
    } else {
      props.onMaxPriceChange(value);
    }
  }

  return (
    <div className="rounded-2xl border border-outline-variant/80 bg-surface-container-lowest p-space-md">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-space-sm">
        <h2 className="font-title text-title text-on-surface">Filter by</h2>
        <button
          type="button"
          onClick={props.onClear}
          className="font-label-md text-label-md text-primary-container hover:underline"
        >
          Clear
        </button>
      </div>

      <div className="border-b border-outline-variant/60 py-space-md">
        <div className="mb-space-xs flex items-center justify-between">
          <label htmlFor="budgetRange" className="font-title text-label-md text-on-surface">
            Your budget per night
          </label>
          <span className="font-price-tabular text-label-md font-extrabold text-on-surface">{budgetLabel}</span>
        </div>
        <p className="mb-space-sm font-body-sm text-label-sm text-on-surface-variant">Max nightly price</p>

        {priceCeiling === null ? (
          <p className="font-label-sm text-label-sm text-on-surface-variant">Available once results load.</p>
        ) : (
          <>
            <input
              id="budgetRange"
              type="range"
              min={priceStep}
              max={priceCeiling}
              step={priceStep}
              value={sliderValue}
              onChange={(event) => handleSliderChange(Number(event.target.value))}
              className="h-2 w-full cursor-pointer rounded-lg bg-surface-container-high accent-primary-container"
            />
            <div className="mt-space-xs flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>{formatMoney(priceStep, currency)}</span>
              <span>{formatMoney(priceCeiling, currency)}+</span>
            </div>
          </>
        )}
      </div>

      <div className="border-b border-outline-variant/60 py-space-md">
        <span className="mb-space-xs block font-title text-label-md text-on-surface">Star rating</span>
        <div className="flex flex-wrap gap-1.5 pt-space-xs">
          {STAR_CHOICES.map((stars) => {
            const selected = minStars === stars;
            return (
              <button
                key={stars}
                type="button"
                aria-pressed={selected}
                // Clicking the chosen pill again clears it
                onClick={() => props.onMinStarsChange(selected ? null : stars)}
                className={`rounded-full border px-2.5 py-1.5 font-label-sm text-label-sm transition-colors ${
                  selected
                    ? "border-primary-container bg-secondary-container/30 font-semibold text-primary-container"
                    : "border-outline-variant text-on-surface hover:border-primary-container"
                }`}
              >
                {stars}+ ★
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-space-md">
        <label htmlFor="sortBy" className="mb-space-xs block font-title text-label-md text-on-surface">
          Sort by
        </label>
        <select
          id="sortBy"
          value={sort}
          onChange={(event) => props.onSortChange(event.target.value as HotelSort)}
          className="w-full cursor-pointer rounded-[10px] border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 font-label-md text-label-md text-on-surface focus:border-primary-container focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
