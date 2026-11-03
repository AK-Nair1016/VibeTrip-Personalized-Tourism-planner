import { useState, type FormEvent } from "react";
import type { Destination } from "@vibetrip/shared-types";
import { addDays, countNights, defaultStay, STAY_LIMITS, today, type StayQuery } from "../hotels/stayDates";
import SearchField, { SearchDivider, searchInputClass } from "./SearchField";

export interface StaySearch extends StayQuery {
  city: string;
}

interface StaySearchFormProps {
  destinations: Destination[];
  // Prefill, used by the results page so the bar shows the current search
  initial?: Partial<StaySearch>;
  onSubmit: (search: StaySearch) => void;
}

// 1 to max, for the guests and rooms dropdowns
function numberOptions(max: number): number[] {
  const options: number[] = [];
  for (let count = 1; count <= max; count++) {
    options.push(count);
  }
  return options;
}

// Where / check-in / check-out / guests / rooms. Used on the home page and on the results page.
export default function StaySearchForm({ destinations, initial, onSubmit }: StaySearchFormProps) {
  const defaults = defaultStay();

  const [city, setCity] = useState(initial?.city ?? "");
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? defaults.checkIn);
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? defaults.checkOut);
  const [guests, setGuests] = useState(initial?.guests ?? defaults.guests);
  const [rooms, setRooms] = useState(initial?.rooms ?? defaults.rooms);
  const [formError, setFormError] = useState("");

  function handleCheckInChange(value: string) {
    setCheckIn(value);

    // Keep check-out after check-in so the user does not have to fix both dates
    if (value && checkOut <= value) {
      setCheckOut(addDays(value, 1));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Same rules the backend checks, so the user hears about a mistake without a round trip
    if (!city) {
      setFormError("Choose a city.");
      return;
    }
    if (!checkIn || !checkOut) {
      setFormError("Choose your check-in and check-out dates.");
      return;
    }
    if (checkIn < today()) {
      setFormError("Check-in cannot be in the past.");
      return;
    }
    if (checkIn > addDays(today(), STAY_LIMITS.maxDaysAhead)) {
      setFormError(`Check-in must be within ${STAY_LIMITS.maxDaysAhead} days from today.`);
      return;
    }
    if (checkOut <= checkIn) {
      setFormError("Check-out must be after check-in.");
      return;
    }
    if (countNights(checkIn, checkOut) > STAY_LIMITS.maxNights) {
      setFormError(`You can stay at most ${STAY_LIMITS.maxNights} nights.`);
      return;
    }
    if (guests < rooms) {
      setFormError("There cannot be more rooms than guests.");
      return;
    }

    setFormError("");
    onSubmit({ city, checkIn, checkOut, guests, rooms });
  }

  // Cities still loading (or failed): keep the current city selectable so the bar is not empty
  const hasCurrentCity = destinations.some((destination) => destination.city === city);

  return (
    <form onSubmit={handleSubmit} className="w-full text-left">
      <div className="flex flex-col gap-1 rounded-3xl border border-outline-variant bg-surface-container-lowest p-2 shadow-[0_6px_20px_rgba(0,0,0,0.10)] md:flex-row md:items-center md:gap-0 md:rounded-full">
        <SearchField label="Where" className="flex-[1.4]">
          <select value={city} onChange={(event) => setCity(event.target.value)} className={searchInputClass}>
            <option value="">{destinations.length === 0 && !city ? "Loading cities..." : "Choose a city"}</option>
            {city && !hasCurrentCity ? <option value={city}>{city}</option> : null}
            {destinations.map((destination) => (
              <option key={destination.code} value={destination.city}>
                {destination.city}, {destination.country}
              </option>
            ))}
          </select>
        </SearchField>
        <SearchDivider />

        <SearchField label="Check-in">
          <input
            type="date"
            value={checkIn}
            min={today()}
            max={addDays(today(), STAY_LIMITS.maxDaysAhead)}
            onChange={(event) => handleCheckInChange(event.target.value)}
            className={searchInputClass}
          />
        </SearchField>
        <SearchDivider />

        <SearchField label="Check-out">
          <input
            type="date"
            value={checkOut}
            min={checkIn ? addDays(checkIn, 1) : today()}
            onChange={(event) => setCheckOut(event.target.value)}
            className={searchInputClass}
          />
        </SearchField>
        <SearchDivider />

        <SearchField label="Guests" className="md:w-28">
          <select value={guests} onChange={(event) => setGuests(Number(event.target.value))} className={searchInputClass}>
            {numberOptions(STAY_LIMITS.maxGuests).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </SearchField>
        <SearchDivider />

        <SearchField label="Rooms" className="md:w-28">
          <select value={rooms} onChange={(event) => setRooms(Number(event.target.value))} className={searchInputClass}>
            {numberOptions(STAY_LIMITS.maxRooms).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "room" : "rooms"}
              </option>
            ))}
          </select>
        </SearchField>

        <button
          type="submit"
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary-container px-7 py-3.5 font-title text-label-md text-on-primary shadow-sm transition hover:bg-primary"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span>Search</span>
        </button>
      </div>

      {formError ? (
        <p role="alert" className="mt-2 text-center font-label-md text-label-md text-error">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
