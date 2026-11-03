import type { FlightSlice } from "@vibetrip/shared-types";
import {
  airlineCode,
  circleColour,
  dayOffset,
  formatSliceDuration,
  formatTime,
  stopsLabel
} from "./flightFormat";

interface FlightSliceRowProps {
  slice: FlightSlice;
  label?: string; // e.g. "Outbound · Thu 12 Nov"
}

// One direction of a trip: airline, flight numbers, times, duration and stops.
export default function FlightSliceRow({ slice, label }: FlightSliceRowProps) {
  const firstSegment = slice.segments[0];
  const lastSegment = slice.segments[slice.segments.length - 1];

  const flightNumbers: string[] = [];
  for (const segment of slice.segments) {
    flightNumbers.push(segment.flightNumber);
  }

  const code = airlineCode(firstSegment.flightNumber);
  const extraDays = dayOffset(firstSegment.departingAt, lastSegment.arrivingAt);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          {/* No logo images: the two-letter airline code in a coloured circle */}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-md ${circleColour(code)}`}
          >
            {code}
          </div>
          <div>
            <span className="text-label-md text-on-surface">{firstSegment.airline}</span>
            <span className="ml-2 text-body-sm text-outline">{flightNumbers.join(" · ")}</span>
          </div>
        </div>
        {label ? <span className="text-label-sm text-outline">{label}</span> : null}
      </div>

      <div className="grid grid-cols-12 items-center gap-2">
        <div className="col-span-3">
          <div className="text-headline-sm text-on-surface">{formatTime(firstSegment.departingAt)}</div>
          <div className="text-label-md text-outline">{slice.origin}</div>
        </div>

        <div className="col-span-6 flex flex-col items-center px-space-xs">
          <span className="text-label-sm text-outline">{formatSliceDuration(slice)}</span>
          <div className="my-1 flex w-full items-center">
            <div className="h-[2px] flex-1 bg-surface-variant" />
            {slice.stops > 0 ? (
              <div className="z-10 mx-1 h-2.5 w-2.5 shrink-0 rounded-full bg-surface-container-lowest shadow-[0_0_0_2px_#7f4025]" />
            ) : null}
            <span className="material-symbols-outlined mx-1 text-[18px] text-primary-container">flight</span>
            <div className="h-[2px] flex-1 bg-surface-variant" />
          </div>
          <span
            className={
              slice.stops === 0 ? "text-label-sm text-primary" : "text-label-sm text-tertiary"
            }
          >
            {stopsLabel(slice)}
          </span>
        </div>

        <div className="col-span-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="text-headline-sm text-on-surface">{formatTime(lastSegment.arrivingAt)}</span>
            {extraDays > 0 ? (
              <span className="rounded bg-tertiary-fixed px-1 py-0.5 text-label-sm leading-none text-tertiary">
                +{extraDays}
              </span>
            ) : null}
          </div>
          <div className="text-label-md text-outline">{slice.destination}</div>
        </div>
      </div>
    </div>
  );
}
