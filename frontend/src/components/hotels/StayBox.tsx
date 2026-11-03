import type { Money } from "@vibetrip/shared-types";
import { formatMoney } from "../../utils/formatMoney";
import { addDays, STAY_LIMITS, today, type StayQuery } from "./stayDates";

interface StayBoxProps {
  stay: StayQuery;
  nights: number;
  // The cheapest room for the stay, once rooms have loaded
  cheapestPerNight: Money | null;
  cheapestTotal: Money | null;
  // True for hotels where the guest pays at the property
  payAtHotel: boolean;
  onChange: (patch: Partial<StayQuery>) => void;
}

function numberOptions(max: number): number[] {
  const options: number[] = [];
  for (let count = 1; count <= max; count++) {
    options.push(count);
  }
  return options;
}

const labelClass = "font-title text-[11px] uppercase tracking-wider text-on-surface-variant";
const inputClass = "mt-0.5 w-full bg-transparent font-label-md text-label-md text-on-surface focus:outline-none";

// The sticky card on the right. Changing a date or the guests re-queries the rooms list.
export default function StayBox({ stay, nights, cheapestPerNight, cheapestTotal, payAtHotel, onChange }: StayBoxProps) {
  return (
    <div className="flex w-full flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-baseline gap-1.5">
        {cheapestPerNight ? (
          <>
            <span className="text-on-surface-variant font-body-sm text-body-sm">from</span>
            <span className="font-headline-md text-headline-md font-extrabold tracking-tight text-on-surface">
              {formatMoney(cheapestPerNight.amount, cheapestPerNight.currency)}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">night</span>
          </>
        ) : (
          <span className="font-title text-title text-on-surface">Pick your dates</span>
        )}
      </div>

      <div className="divide-y divide-outline-variant/60 overflow-hidden rounded-xl bg-surface-container-low/60">
        <div className="grid grid-cols-2 divide-x divide-outline-variant/60">
          <label className="flex flex-col p-3">
            <span className={labelClass}>Check-in</span>
            <input
              type="date"
              value={stay.checkIn}
              min={today()}
              max={addDays(today(), STAY_LIMITS.maxDaysAhead)}
              onChange={(event) => onChange({ checkIn: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col p-3">
            <span className={labelClass}>Check-out</span>
            <input
              type="date"
              value={stay.checkOut}
              min={addDays(stay.checkIn, 1)}
              onChange={(event) => onChange({ checkOut: event.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 divide-x divide-outline-variant/60">
          <label className="flex flex-col p-3">
            <span className={labelClass}>Guests</span>
            <select
              value={stay.guests}
              onChange={(event) => onChange({ guests: Number(event.target.value) })}
              className={inputClass}
            >
              {numberOptions(STAY_LIMITS.maxGuests).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col p-3">
            <span className={labelClass}>Rooms</span>
            <select
              value={stay.rooms}
              onChange={(event) => onChange({ rooms: Number(event.target.value) })}
              className={inputClass}
            >
              {numberOptions(STAY_LIMITS.maxRooms).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? "room" : "rooms"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <a
        href="#rooms"
        className="w-full rounded-xl bg-primary-container px-4 py-3.5 text-center font-title text-label-md tracking-wide text-on-primary shadow-sm transition-opacity hover:opacity-95"
      >
        Choose a room
      </a>

      {payAtHotel ? (
        <p className="-mt-1 text-center font-label-sm text-label-sm text-on-surface-variant">
          You won't be charged now. Pay at the hotel.
        </p>
      ) : null}

      {cheapestTotal ? (
        <div className="flex flex-col gap-2.5 pt-space-xs font-body-sm text-body-sm text-on-surface">
          <div className="h-px w-full bg-outline-variant/60" />
          <div className="flex items-baseline justify-between">
            <span className="font-title text-title text-on-surface">
              Total for {nights} {nights === 1 ? "night" : "nights"}
            </span>
            <span className="font-price-tabular text-price-tabular text-on-surface">
              {formatMoney(cheapestTotal.amount, cheapestTotal.currency)}
            </span>
          </div>
          <span className="-mt-1 text-[12px] text-on-surface-variant">Cheapest room. Includes taxes and fees.</span>
        </div>
      ) : null}
    </div>
  );
}
