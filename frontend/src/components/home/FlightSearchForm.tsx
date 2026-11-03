import { useState, type FormEvent } from "react";
import { CABIN_CLASSES, type CabinClass, type Destination } from "@vibetrip/shared-types";
import { today } from "../hotels/stayDates";
import SearchField, { SearchDivider, searchInputClass } from "./SearchField";

export interface FlightSearch {
  origin: string; // city code, e.g. "DEL"
  destination: string;
  departureDate: string;
  returnDate: string; // empty means one way
  adults: number;
  cabinClass: CabinClass;
}

interface FlightSearchFormProps {
  destinations: Destination[];
  onSubmit: (search: FlightSearch) => void;
}

const MAX_ADULTS = 9; // Duffel allows at most 9 passengers per search

// "premium_economy" -> "Premium economy"
function cabinLabel(cabin: string): string {
  const spaced = cabin.replace("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function adultOptions(): number[] {
  const options: number[] = [];
  for (let count = 1; count <= MAX_ADULTS; count++) {
    options.push(count);
  }
  return options;
}

// Origin / destination / dates / adults / cabin. Leaving "Return" empty searches one way.
export default function FlightSearchForm({ destinations, onSubmit }: FlightSearchFormProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [formError, setFormError] = useState("");

  function handleDepartureChange(value: string) {
    setDepartureDate(value);

    // A return date before the new departure date would be rejected, so clear it
    if (returnDate && value && returnDate < value) {
      setReturnDate("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!origin || !destination) {
      setFormError("Choose where you are flying from and to.");
      return;
    }
    if (origin === destination) {
      setFormError("From and To must be different cities.");
      return;
    }
    if (!departureDate) {
      setFormError("Choose a departure date.");
      return;
    }

    setFormError("");
    onSubmit({ origin, destination, departureDate, returnDate, adults, cabinClass });
  }

  // Shown inside both city dropdowns
  const cityOptions = destinations.map((item) => (
    <option key={item.code} value={item.code}>
      {item.city} ({item.code})
    </option>
  ));
  const placeholder = destinations.length === 0 ? "Loading cities..." : "Choose a city";

  return (
    <form onSubmit={handleSubmit} className="w-full text-left">
      <div className="flex flex-col gap-1 rounded-3xl border border-outline-variant bg-surface-container-lowest p-2 shadow-[0_6px_20px_rgba(0,0,0,0.10)] md:flex-row md:items-center md:gap-0 md:rounded-full">
        <SearchField label="From">
          <select value={origin} onChange={(event) => setOrigin(event.target.value)} className={searchInputClass}>
            <option value="">{placeholder}</option>
            {cityOptions}
          </select>
        </SearchField>
        <SearchDivider />

        <SearchField label="To">
          <select value={destination} onChange={(event) => setDestination(event.target.value)} className={searchInputClass}>
            <option value="">{placeholder}</option>
            {cityOptions}
          </select>
        </SearchField>
        <SearchDivider />

        <SearchField label="Depart">
          <input
            type="date"
            value={departureDate}
            min={today()}
            onChange={(event) => handleDepartureChange(event.target.value)}
            className={searchInputClass}
          />
        </SearchField>
        <SearchDivider />

        <SearchField label="Return (optional)">
          <input
            type="date"
            value={returnDate}
            min={departureDate || today()}
            onChange={(event) => setReturnDate(event.target.value)}
            className={searchInputClass}
          />
        </SearchField>
        <SearchDivider />

        <SearchField label="Adults" className="md:w-24">
          <select value={adults} onChange={(event) => setAdults(Number(event.target.value))} className={searchInputClass}>
            {adultOptions().map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </SearchField>
        <SearchDivider />

        <SearchField label="Cabin" className="md:w-36">
          <select
            value={cabinClass}
            onChange={(event) => setCabinClass(event.target.value as CabinClass)}
            className={searchInputClass}
          >
            {CABIN_CLASSES.map((cabin) => (
              <option key={cabin} value={cabin}>
                {cabinLabel(cabin)}
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
