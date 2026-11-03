import type { FlightOffer } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";
import {
  adultsLabel,
  formatDay,
  formatSliceDuration,
  formatTime,
  routeTitle,
  stopsLabel
} from "./flightFormat";

interface FlightSummaryCardProps {
  offer: FlightOffer;
  adults: number;
  cabinLabel?: string;
  // Always the server's numbers: the offer's price first, then the booking's totalAmount
  total: { amount: number; currency: string };
}

// The right-hand card: what is being bought and what it costs.
// The API gives one total only (no fare/taxes split), so no breakdown is shown.
export default function FlightSummaryCard({ offer, adults, cabinLabel, total }: FlightSummaryCardProps) {
  const isRoundTrip = offer.slices.length > 1;
  const firstDay = formatDay(offer.slices[0].segments[0].departingAt);

  let subtitle = `${firstDay} · ${adultsLabel(adults)}`;
  if (isRoundTrip) {
    const lastSlice = offer.slices[offer.slices.length - 1];
    subtitle = `${firstDay} - ${formatDay(lastSlice.segments[0].departingAt)} · ${adultsLabel(adults)}`;
  }

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[360px]">
      <div className="rounded-xl bg-surface-container-lowest p-6 shadow-md">
        <div className="flex items-center gap-3.5 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container/40 text-primary-container">
            <span className="material-symbols-outlined text-[24px]">flight_takeoff</span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-title text-on-surface">{routeTitle(offer)}</h2>
            <p className="text-label-sm text-on-surface-variant">{subtitle}</p>
          </div>
        </div>

        {offer.slices.map((slice, index) => {
          const first = slice.segments[0];
          const last = slice.segments[slice.segments.length - 1];
          const numbers: string[] = [];
          for (const segment of slice.segments) {
            numbers.push(segment.flightNumber);
          }

          let direction = "";
          if (isRoundTrip) {
            direction = index === 0 ? "Outbound" : "Return";
          }

          return (
            <div key={index} className="my-3 rounded-lg bg-surface-container-low px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-label-sm text-on-surface-variant">
                <span className="truncate">
                  <span className="text-on-surface">{numbers.join(" · ")}</span> · {stopsLabel(slice)}
                </span>
                {cabinLabel ? (
                  <span className="shrink-0 rounded bg-surface-container-lowest px-2 py-0.5">{cabinLabel}</span>
                ) : null}
              </div>
              {direction ? (
                <p className="mb-1 text-label-sm text-outline">
                  {direction} · {formatDay(first.departingAt)}
                </p>
              ) : null}
              <div className="flex items-center justify-between text-on-surface">
                <div className="flex items-center gap-2">
                  <span className="text-body-medium">{formatTime(first.departingAt)}</span>
                  <span className="text-label-sm text-on-surface-variant">{slice.origin}</span>
                </div>
                <span className="text-label-sm text-on-surface-variant">{formatSliceDuration(slice)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-body-medium">{formatTime(last.arrivingAt)}</span>
                  <span className="text-label-sm text-on-surface-variant">{slice.destination}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-4 rounded-xl bg-surface-container-low p-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-body-medium text-on-surface">Total</span>
            <span className="text-headline-sm tabular-nums text-on-surface">
              {formatMoney(total.amount, total.currency)}
            </span>
          </div>
          <p className="mt-0.5 text-right text-label-sm text-on-surface-variant">
            For {adultsLabel(adults)}. Includes all taxes and carrier surcharges
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-surface-container-low p-3 text-on-surface-variant">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-primary-container">
          verified_user
        </span>
        <p className="text-label-sm leading-relaxed">
          We recheck the fare with {offer.airline} before charging you. The total shown is the total you pay.
        </p>
      </div>
    </aside>
  );
}
