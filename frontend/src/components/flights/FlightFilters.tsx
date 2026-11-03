import type { FlightOffer } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";
import {
  DEPARTURE_SLOTS,
  EMPTY_FILTERS,
  hasActiveFilters,
  stopsBucket,
  type FlightFilterState
} from "./flightFilterLogic";

interface FlightFiltersProps {
  offers: FlightOffer[]; // every offer from the search, so the counts do not change as you filter
  filters: FlightFilterState;
  onChange: (filters: FlightFilterState) => void;
}

// Adds the value to the list if it is missing, removes it if it is there.
function toggle<T>(list: T[], value: T): T[] {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }
  return [...list, value];
}

const STOP_OPTIONS = [
  { value: 0, label: "Non-stop" },
  { value: 1, label: "1 stop" }
];

// The left panel: stops, departure time, airlines. It only changes the filter state;
// the page applies it to the offers.
export default function FlightFilters({ offers, filters, onChange }: FlightFiltersProps) {
  // How many offers fall in each stops bucket
  const stopCounts = [0, 0];
  for (const offer of offers) {
    stopCounts[stopsBucket(offer)] += 1;
  }

  // The cheapest total per airline, shown next to its name like the mock
  const cheapestByAirline: Record<string, { amount: number; currency: string }> = {};
  for (const offer of offers) {
    const known = cheapestByAirline[offer.airline];
    if (!known || offer.price.amount < known.amount) {
      cheapestByAirline[offer.airline] = offer.price;
    }
  }
  const airlineNames = Object.keys(cheapestByAirline).sort();

  return (
    <aside className="w-full shrink-0 rounded-xl bg-surface-container-lowest p-space-md shadow-sm lg:sticky lg:top-24 lg:w-[268px]">
      <div className="flex items-center justify-between pb-space-sm">
        <h2 className="text-title text-on-surface">Filter by</h2>
        {hasActiveFilters(filters) ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-label-sm text-primary-container underline hover:opacity-80"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="my-space-sm h-px w-full bg-surface-variant" />

      <div className="py-space-xs">
        <h3 className="mb-space-sm text-label-md text-on-surface">Stops</h3>
        <div className="flex flex-col gap-space-sm">
          {STOP_OPTIONS.map((option) => {
            const count = stopCounts[option.value];
            const isDisabled = count === 0;
            return (
              <label
                key={option.value}
                className={`flex items-center justify-between ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <span className="flex items-center gap-space-xs">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded accent-primary-container"
                    disabled={isDisabled}
                    checked={filters.stops.includes(option.value)}
                    onChange={() => onChange({ ...filters, stops: toggle(filters.stops, option.value) })}
                  />
                  <span className="text-body-sm text-on-surface">{option.label}</span>
                </span>
                <span className="text-label-sm text-outline">{count}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="my-space-sm h-px w-full bg-surface-variant" />

      <div className="py-space-xs">
        <h3 className="mb-space-sm text-label-md text-on-surface">Departure time</h3>
        <div className="grid grid-cols-2 gap-space-xs">
          {DEPARTURE_SLOTS.map((slot) => {
            const isOn = filters.times.includes(slot.id);
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => onChange({ ...filters, times: toggle(filters.times, slot.id) })}
                className={`flex flex-col items-center justify-center rounded-lg p-2 text-center transition-all ${
                  isOn
                    ? "bg-secondary-fixed text-primary-container shadow-sm"
                    : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <span className="text-label-md">{slot.label}</span>
                <span className={`text-label-sm ${isOn ? "" : "text-outline"}`}>{slot.range}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="my-space-sm h-px w-full bg-surface-variant" />

      <div className="py-space-xs">
        <h3 className="mb-space-sm text-label-md text-on-surface">Airlines</h3>
        <div className="flex flex-col gap-space-sm">
          {airlineNames.map((name) => (
            <label key={name} className="flex cursor-pointer items-center justify-between gap-space-sm">
              <span className="flex min-w-0 items-center gap-space-xs">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 rounded accent-primary-container"
                  checked={filters.airlines.includes(name)}
                  onChange={() => onChange({ ...filters, airlines: toggle(filters.airlines, name) })}
                />
                <span className="truncate text-body-sm text-on-surface">{name}</span>
              </span>
              <span className="shrink-0 text-label-sm text-on-surface">
                {formatMoney(cheapestByAirline[name].amount, cheapestByAirline[name].currency)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
