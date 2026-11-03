import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { CurrencyCode, Destination, HotelSearchResult, HotelSort } from "@vibetrip/shared-types";
import { fetchDestinations } from "../api/destinations";
import { searchHotels } from "../api/hotels";
import StaySearchForm, { type StaySearch } from "../components/home/StaySearchForm";
import HotelFilters from "../components/hotels/HotelFilters";
import HotelResultCard from "../components/hotels/HotelResultCard";
import { defaultStay, formatDate, readNumber, stayToQueryString } from "../components/hotels/stayDates";
import { useWishlist } from "../components/hotels/useWishlist";
import { useCurrencyStore } from "../store/currencyStore";
import { readApiError } from "../utils/apiError";
import styles from "./HotelResultsPage.module.css";

// How long to wait after the slider stops moving before asking the backend again
const SLIDER_DELAY_MS = 400;

// The slider top is the dearest nightly price rounded up to a tidy number (14,230 -> 15,000),
// so the slider works the same in rupees and in pounds.
function roundUpCeiling(maxAmount: number): number {
  const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(maxAmount)) - 1));
  return Math.ceil(maxAmount / magnitude) * magnitude;
}

function stepFor(ceiling: number): number {
  const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(ceiling)) - 1));
  return Math.max(1, magnitude / 2);
}

interface ResultsContentProps {
  destinations: Destination[];
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  currency: CurrencyCode;
  onSearch: (search: StaySearch) => void;
}

// Holds the filters and the results. The outer page gives it a `key` made of city and currency,
// so changing either one starts this component fresh. That is on purpose: a price limit typed in
// rupees means nothing once the currency becomes pounds, and a new city has a different price range.
function ResultsContent(props: ResultsContentProps) {
  const { destinations, city, checkIn, checkOut, guests, rooms, currency } = props;

  const [minStars, setMinStars] = useState<number | null>(null);
  const [maxPriceInput, setMaxPriceInput] = useState<number | null>(null); // follows the slider
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null); // what we last asked for
  const [sort, setSort] = useState<HotelSort>("price_asc");
  const [priceCeiling, setPriceCeiling] = useState<number | null>(null);

  const [result, setResult] = useState<HotelSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // A 422 (bad city or dates in the address) will not fix itself, so no "Try again" for it
  const [errorRetryable, setErrorRetryable] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const wishlist = useWishlist();

  // Wait for the slider to settle before searching again
  useEffect(() => {
    const timer = setTimeout(() => setAppliedMaxPrice(maxPriceInput), SLIDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [maxPriceInput]);

  useEffect(() => {
    // A newer search started (or the page closed): drop this reply instead of showing stale hotels
    let cancelled = false;

    async function runSearch() {
      setLoading(true);
      setError("");
      try {
        const data = await searchHotels({
          city,
          checkIn,
          checkOut,
          guests,
          rooms,
          currency,
          minStars: minStars ?? undefined,
          maxPrice: appliedMaxPrice ?? undefined,
          sort
        });
        if (cancelled) {
          return;
        }
        setResult(data);

        // Learn the price range only from searches without a price limit, and never shrink it
        if (appliedMaxPrice === null && data.hotels.length > 0) {
          let dearest = 0;
          for (const hotel of data.hotels) {
            if (hotel.lowestPricePerNight.amount > dearest) {
              dearest = hotel.lowestPricePerNight.amount;
            }
          }
          const newCeiling = roundUpCeiling(dearest);
          setPriceCeiling((previous) => (previous === null ? newCeiling : Math.max(previous, newCeiling)));
        }
      } catch (caught) {
        if (!cancelled) {
          const info = readApiError(caught);
          setResult(null);
          setError(info.message);
          setErrorRetryable(info.status !== 422);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [city, checkIn, checkOut, guests, rooms, currency, minStars, appliedMaxPrice, sort, attempt]);

  function clearFilters() {
    setMinStars(null);
    setMaxPriceInput(null);
    setAppliedMaxPrice(null);
    setSort("price_asc");
  }

  const filtersActive = minStars !== null || appliedMaxPrice !== null;
  const stayQuery = stayToQueryString({ checkIn, checkOut, guests, rooms });
  const hotelCount = result ? result.hotels.length : 0;

  return (
    <div className={styles.div1}>
      <div className={styles.div2}>
        {/* key: when the URL changes (back button, new search) the form starts again from the new values */}
        <StaySearchForm
          key={`${city}|${checkIn}|${checkOut}|${guests}|${rooms}`}
          destinations={destinations}
          initial={{ city, checkIn, checkOut, guests, rooms }}
          onSubmit={props.onSearch}
        />
      </div>

      <div className={styles.div3}>
        <aside className={styles.aside1}>
          <HotelFilters
            currency={currency}
            priceCeiling={priceCeiling}
            priceStep={priceCeiling === null ? 1 : stepFor(priceCeiling)}
            maxPrice={maxPriceInput}
            minStars={minStars}
            sort={sort}
            onMaxPriceChange={setMaxPriceInput}
            onMinStarsChange={setMinStars}
            onSortChange={setSort}
            onClear={clearFilters}
          />
        </aside>

        <section className={styles.section1} aria-busy={loading}>
          <header className={styles.header1}>
            <h1 className={styles.h11}>
              {result ? `${city}: ${hotelCount} ${hotelCount === 1 ? "stay" : "stays"} found` : `Stays in ${city}`}
            </h1>
            <p className={styles.p1}>
              Prices include taxes and fees · {formatDate(checkIn)} to {formatDate(checkOut)}
              {result ? ` (${result.nights} ${result.nights === 1 ? "night" : "nights"})` : ""}
            </p>
          </header>

          {wishlist.error ? (
            <div
              role="alert"
              className={styles.div4}
            >
              <span>{wishlist.error}</span>
              <button type="button" onClick={wishlist.clearError} className={styles.button1}>
                Dismiss
              </button>
            </div>
          ) : null}

          {/* Loading for the first time: grey placeholder rows */}
          {loading && !result && !error ? (
            <div className={styles.div5}>
              {[0, 1, 2].map((index) => (
                <div key={index} className={styles.div6} />
              ))}
            </div>
          ) : null}

          {error ? (
            <div role="alert" className={styles.div7}>
              <span className={`${styles.span1} material-symbols-outlined`}>cloud_off</span>
              <p className={styles.p2}>{error}</p>
              {errorRetryable ? (
                <button
                  type="button"
                  onClick={() => setAttempt(attempt + 1)}
                  className={styles.button2}
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}

          {!error && result && hotelCount === 0 ? (
            <div className={styles.div8}>
              <span className={`${styles.span1} material-symbols-outlined`}>search_off</span>
              {filtersActive ? (
                <>
                  <h2 className={styles.h21}>No stays match these filters</h2>
                  <p className={styles.p3}>
                    Raise your budget or lower the star rating.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={styles.button2}
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <h2 className={styles.h21}>No stays available</h2>
                  <p className={styles.p4}>
                    Nothing is free in {city} for these dates and rooms. Try other dates or fewer rooms.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {!error && result && hotelCount > 0 ? (
            // Dimmed while a new search runs, so the list does not jump around as the slider moves
            <div className={loading ? styles.listLoading : styles.list}>
              {result.hotels.map((hotel) => (
                <HotelResultCard
                  key={hotel.id}
                  hotel={hotel}
                  stayQuery={stayQuery}
                  saved={wishlist.isSaved(hotel.id)}
                  canToggle={wishlist.canToggle}
                  onToggle={() => wishlist.toggle(hotel.id)}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

// Reads the search from the URL, loads the city list for the search bar, and renders the results.
export default function HotelResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = useCurrencyStore((state) => state.currency);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  // Only the search bar needs the cities, so if this fails the page still works
  // (the bar keeps showing the current city).
  useEffect(() => {
    let cancelled = false;

    async function loadDestinations() {
      try {
        const cities = await fetchDestinations();
        if (!cancelled) {
          setDestinations(cities);
        }
      } catch {
        // Not worth an error banner: the results below do not depend on it
      }
    }

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, []);

  const defaults = defaultStay();
  const city = searchParams.get("city") ?? "";
  const checkIn = searchParams.get("checkIn") ?? defaults.checkIn;
  const checkOut = searchParams.get("checkOut") ?? defaults.checkOut;
  const guests = readNumber(searchParams.get("guests"), defaults.guests);
  const rooms = readNumber(searchParams.get("rooms"), defaults.rooms);

  function handleSearch(search: StaySearch) {
    const next = new URLSearchParams({
      city: search.city,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      guests: String(search.guests),
      rooms: String(search.rooms)
    });
    setSearchParams(next);
  }

  // Someone opened /hotels with no city: ask for one instead of calling the backend with nothing
  if (!city) {
    return (
      <div className={styles.div9}>
        <h1 className={styles.h12}>Where do you want to stay?</h1>
        <StaySearchForm destinations={destinations} onSubmit={handleSearch} />
      </div>
    );
  }

  return (
    <ResultsContent
      key={`${city}|${currency}`}
      destinations={destinations}
      city={city}
      checkIn={checkIn}
      checkOut={checkOut}
      guests={guests}
      rooms={rooms}
      currency={currency}
      onSearch={handleSearch}
    />
  );
}
