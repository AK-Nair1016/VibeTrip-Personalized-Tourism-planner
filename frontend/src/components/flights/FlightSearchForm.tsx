import { useState, type FormEvent } from "react";
import { CABIN_CLASSES, type CabinClass } from "@vibetrip/shared-types";
import { CABIN_LABELS, FLIGHT_CITIES, todayString } from "./flightFormat";

// The search as plain text, the way it sits in the URL.
export interface FlightSearchValues {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string; // "" for a one-way trip
  adults: string;
  cabinClass: CabinClass;
}

interface FlightSearchFormProps {
  initial: FlightSearchValues;
  onSearch: (values: FlightSearchValues) => void;
}

const inputClass =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface focus:border-primary-container focus:outline-none";
const labelClass = "mb-1 block text-label-sm text-on-surface-variant";

// The compact form at the top of the results page. It does not search by itself:
// it hands the values to the page, which puts them in the URL.
export default function FlightSearchForm({ initial, onSearch }: FlightSearchFormProps) {
  const [values, setValues] = useState<FlightSearchValues>(initial);
  const [isRoundTrip, setIsRoundTrip] = useState(initial.returnDate !== "");
  const [errorMessage, setErrorMessage] = useState("");

  const today = todayString();

  function setField(field: keyof FlightSearchValues, value: string) {
    setValues({ ...values, [field]: value });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // The server checks all of this again; checking here just saves a trip
    if (!values.origin || !values.destination) {
      setErrorMessage("Choose where you are flying from and to.");
      return;
    }
    if (values.origin === values.destination) {
      setErrorMessage("From and To must be different cities.");
      return;
    }
    if (!values.departureDate) {
      setErrorMessage("Choose a departure date.");
      return;
    }
    if (values.departureDate < today) {
      setErrorMessage("The departure date cannot be in the past.");
      return;
    }
    if (isRoundTrip && !values.returnDate) {
      setErrorMessage("Choose a return date, or switch to one way.");
      return;
    }
    if (isRoundTrip && values.returnDate < values.departureDate) {
      setErrorMessage("The return date cannot be before the departure date.");
      return;
    }

    setErrorMessage("");
    // A one-way search must not carry an old return date
    let returnDate = "";
    if (isRoundTrip) {
      returnDate = values.returnDate;
    }
    onSearch({ ...values, returnDate });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="mb-space-md flex gap-space-sm">
        <button
          type="button"
          onClick={() => setIsRoundTrip(false)}
          className={`rounded-full px-4 py-1.5 text-label-md ${
            isRoundTrip ? "text-on-surface-variant hover:bg-surface-container-low" : "bg-secondary-fixed text-primary-container"
          }`}
        >
          One way
        </button>
        <button
          type="button"
          onClick={() => setIsRoundTrip(true)}
          className={`rounded-full px-4 py-1.5 text-label-md ${
            isRoundTrip ? "bg-secondary-fixed text-primary-container" : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          Round trip
        </button>
      </div>

      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label htmlFor="flight-origin" className={labelClass}>
            From
          </label>
          <select
            id="flight-origin"
            className={inputClass}
            value={values.origin}
            onChange={(event) => setField("origin", event.target.value)}
          >
            <option value="">Choose a city</option>
            {FLIGHT_CITIES.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name} ({city.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="flight-destination" className={labelClass}>
            To
          </label>
          <select
            id="flight-destination"
            className={inputClass}
            value={values.destination}
            onChange={(event) => setField("destination", event.target.value)}
          >
            <option value="">Choose a city</option>
            {FLIGHT_CITIES.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name} ({city.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="flight-departure" className={labelClass}>
            Depart
          </label>
          <input
            id="flight-departure"
            type="date"
            className={inputClass}
            min={today}
            value={values.departureDate}
            onChange={(event) => setField("departureDate", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="flight-return" className={labelClass}>
            Return
          </label>
          <input
            id="flight-return"
            type="date"
            className={`${inputClass} disabled:opacity-50`}
            disabled={!isRoundTrip}
            min={values.departureDate || today}
            value={values.returnDate}
            onChange={(event) => setField("returnDate", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="flight-adults" className={labelClass}>
            Adults
          </label>
          <select
            id="flight-adults"
            className={inputClass}
            value={values.adults}
            onChange={(event) => setField("adults", event.target.value)}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
              <option key={count} value={String(count)}>
                {count}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="flight-cabin" className={labelClass}>
            Cabin
          </label>
          <select
            id="flight-cabin"
            className={inputClass}
            value={values.cabinClass}
            onChange={(event) => setField("cabinClass", event.target.value)}
          >
            {CABIN_CLASSES.map((cabin) => (
              <option key={cabin} value={cabin}>
                {CABIN_LABELS[cabin]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-space-md flex flex-col items-start gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-label-md text-error" role="alert">
          {errorMessage}
        </p>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-primary-container px-6 py-2.5 text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          Search flights
        </button>
      </div>
    </form>
  );
}
