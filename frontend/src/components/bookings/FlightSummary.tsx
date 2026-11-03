import type { FlightBooking, FlightLiveStatus } from "../../types/booking";
import { flightLocalDate, flightLocalTime, formatDuration } from "./bookingFormat";

interface FlightSummaryProps {
  booking: FlightBooking;
  liveStatus: FlightLiveStatus | null;
}

// The route of a flight booking, one block per direction, plus the travellers' names.
// Other personal details in the snapshot (birth date, phone, email) are deliberately not shown.
export default function FlightSummary({ booking, liveStatus }: FlightSummaryProps) {
  const slices = booking.snapshot.slices;
  const passengers = booking.snapshot.passengers;

  return (
    <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      {slices.map((slice, sliceIndex) => {
        const firstSegment = slice.segments[0];
        let directionLabel = "Flight";
        if (slices.length > 1 && sliceIndex === 0) {
          directionLabel = "Outbound";
        } else if (slices.length > 1) {
          directionLabel = "Return";
        }
        const stopsLabel = slice.stops === 0 ? "Non-stop" : `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`;

        return (
          <div key={`${slice.origin}-${slice.destination}-${sliceIndex}`}>
            <div className="flex items-center justify-between bg-surface-container-low px-space-lg py-space-md">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-primary-container">flight_takeoff</span>
                <h2 className="font-title text-title text-on-surface">
                  {firstSegment ? `${flightLocalDate(firstSegment.departingAt)} · ` : ""}
                  {slice.origin} to {slice.destination}
                </h2>
              </div>
              <span className="rounded-full bg-[#E6F4F2] px-space-sm py-0.5 font-label-sm text-label-sm font-bold text-primary-container">
                {directionLabel}
              </span>
            </div>

            <div className="space-y-space-md px-space-lg py-space-md">
              <p className="font-label-md text-label-md text-on-surface-variant">
                {formatDuration(slice.duration)} · {stopsLabel}
              </p>

              {slice.segments.map((segment) => (
                <div
                  key={`${segment.flightNumber}-${segment.departingAt}`}
                  className="grid grid-cols-7 items-center gap-space-xs"
                >
                  <div className="col-span-2 text-left">
                    <span className="block font-headline-sm text-headline-sm text-on-surface">
                      {flightLocalTime(segment.departingAt)}
                    </span>
                    <span className="block font-title text-title font-bold text-on-surface-variant">
                      {segment.origin}
                    </span>
                  </div>
                  <div className="col-span-3 flex flex-col items-center px-space-xs">
                    <div className="flex w-full items-center">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary-container" />
                      <div className="h-0.5 w-full bg-surface-container-high" />
                      <span className="material-symbols-outlined mx-1 rotate-90 text-[16px] text-primary-container">
                        flight
                      </span>
                      <div className="h-0.5 w-full bg-surface-container-high" />
                      <span className="h-2 w-2 shrink-0 rounded-full bg-surface-container-highest" />
                    </div>
                    <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                      {segment.airline} {segment.flightNumber}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="block font-headline-sm text-headline-sm text-on-surface">
                      {flightLocalTime(segment.arrivingAt)}
                    </span>
                    <span className="block font-title text-title font-bold text-on-surface-variant">
                      {segment.destination}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="space-y-space-xs bg-surface-container-low px-space-lg py-space-md">
        <div className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">airlines</span>
          <span className="font-bold text-on-surface">{booking.snapshot.airline}</span>
          <span>·</span>
          <span>
            {passengers.length} traveller{passengers.length === 1 ? "" : "s"}:
          </span>
          {passengers.map((passenger, index) => (
            <span key={`${passenger.givenName}-${passenger.familyName}-${index}`} className="font-semibold text-on-surface">
              {passenger.givenName} {passenger.familyName}
              {index < passengers.length - 1 ? "," : ""}
            </span>
          ))}
        </div>

        {liveStatus?.hasAirlineChanges && (
          <p className="flex items-center gap-space-xs font-label-md text-label-md text-[#B45309]">
            <span className="material-symbols-outlined text-[16px]">info</span>
            The airline has changed this schedule. Check with the airline for the new times.
          </p>
        )}
      </div>
    </div>
  );
}
