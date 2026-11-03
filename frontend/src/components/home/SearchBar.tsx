import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Destination } from "@vibetrip/shared-types";
import { stayToQueryString } from "../hotels/stayDates";
import StaySearchForm, { type StaySearch } from "./StaySearchForm";
import FlightSearchForm, { type FlightSearch } from "./FlightSearchForm";

interface SearchBarProps {
  destinations: Destination[];
}

type SearchMode = "stays" | "flights";

const activeTabClass = "bg-surface-container-lowest text-on-surface shadow-sm font-title";
const inactiveTabClass = "text-on-surface-variant hover:text-on-surface font-body-medium";

// The Stays | Flights switcher with the matching search form under it.
// Submitting does not search here: it moves to the results page, which reads the query string.
export default function SearchBar({ destinations }: SearchBarProps) {
  const [mode, setMode] = useState<SearchMode>("stays");
  const navigate = useNavigate();

  function searchStays(search: StaySearch) {
    const params = new URLSearchParams({ city: search.city });
    navigate(`/hotels?${params.toString()}&${stayToQueryString(search)}`);
  }

  function searchFlights(search: FlightSearch) {
    const params = new URLSearchParams({
      origin: search.origin,
      destination: search.destination,
      departureDate: search.departureDate,
      adults: String(search.adults),
      cabinClass: search.cabinClass
    });

    // One way = no returnDate at all, so only add it when the user picked one
    if (search.returnDate) {
      params.set("returnDate", search.returnDate);
    }

    navigate(`/flights?${params.toString()}`);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div
        role="tablist"
        aria-label="Booking type"
        className="mb-6 inline-flex rounded-full border border-outline-variant bg-surface-container-low p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "stays"}
          onClick={() => setMode("stays")}
          className={`rounded-full px-6 py-2 text-label-md transition ${mode === "stays" ? activeTabClass : inactiveTabClass}`}
        >
          Stays
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "flights"}
          onClick={() => setMode("flights")}
          className={`rounded-full px-6 py-2 text-label-md transition ${mode === "flights" ? activeTabClass : inactiveTabClass}`}
        >
          Flights
        </button>
      </div>

      <div className="w-full max-w-5xl">
        {mode === "stays" ? (
          <StaySearchForm destinations={destinations} onSubmit={searchStays} />
        ) : (
          <FlightSearchForm destinations={destinations} onSubmit={searchFlights} />
        )}
      </div>
    </div>
  );
}
