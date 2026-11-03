import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CABIN_CLASSES, type CabinClass, type FlightOffer, type FlightSearchResult } from "@vibetrip/shared-types";
import { searchFlights } from "../api/flights";
import { useCurrencyStore } from "../store/currencyStore";
import { readApiError } from "../utils/apiError";
import { formatMoney } from "../utils/formatMoney";
import FlightFilters from "../components/flights/FlightFilters";
import FlightOfferCard from "../components/flights/FlightOfferCard";
import FlightSearchForm, { type FlightSearchValues } from "../components/flights/FlightSearchForm";
import PriceExpiryBanner from "../components/flights/PriceExpiryBanner";
import {
  applyFilters,
  EMPTY_FILTERS,
  sortOffers,
  type FlightFilterState,
  type SortTab
} from "../components/flights/flightFilterLogic";
import {
  adultsLabel,
  CABIN_LABELS,
  cityName,
  formatDay,
  formatMinutes,
  offerMinutes
} from "../components/flights/flightFormat";
import styles from "./FlightResultsPage.module.css";

// How many cards show at first, and how many each "Show more" adds
const PAGE_SIZE = 10;

type SearchStatus = "idle" | "loading" | "error" | "done";

const TABS: { id: SortTab; label: string }[] = [
  { id: "best", label: "Best" },
  { id: "cheapest", label: "Cheapest" },
  { id: "fastest", label: "Fastest" }
];

// The grey placeholder cards shown while Duffel is searching
function ResultsSkeleton() {
  return (
    <div>
      <div className={styles.div1}>
        <span className={`${styles.span1} material-symbols-outlined`}>progress_activity</span>
        <div>
          <p className={styles.p1}>Searching airlines for live fares...</p>
          <p className={styles.p2}>This can take up to 15 seconds. Please keep this page open.</p>
        </div>
      </div>
      <div className={styles.div2}>
        {[1, 2, 3].map((item) => (
          <div key={item} className={styles.div3}>
            <div className={styles.div4}>
              <div className={styles.div5} />
              <div className={styles.div6} />
              <div className={styles.div7} />
            </div>
            <div className={styles.div8} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface MessagePanelProps {
  icon: string;
  title: string;
  text: string;
  buttonLabel?: string;
  onButton?: () => void;
}

// One box used for the "no search yet", error and empty states
function MessagePanel({ icon, title, text, buttonLabel, onButton }: MessagePanelProps) {
  return (
    <div className={styles.div9}>
      <span className={`${styles.span2} material-symbols-outlined`}>{icon}</span>
      <h2 className={styles.h21}>{title}</h2>
      <p className={styles.p3}>{text}</p>
      {buttonLabel && onButton ? (
        <button
          type="button"
          onClick={onButton}
          className={styles.button1}
        >
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function FlightResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currency = useCurrencyStore((state) => state.currency);

  // 1. Read the search from the URL (the home page search bar and this page's form both write it)
  const origin = searchParams.get("origin") ?? "";
  const destination = searchParams.get("destination") ?? "";
  const departureDate = searchParams.get("departureDate") ?? "";
  const returnDate = searchParams.get("returnDate") ?? "";

  const adultsParam = Number(searchParams.get("adults") ?? "1");
  let adults = 1;
  if (Number.isInteger(adultsParam) && adultsParam >= 1 && adultsParam <= 9) {
    adults = adultsParam;
  }

  let cabinClass: CabinClass = "economy";
  const cabinParam = searchParams.get("cabinClass");
  for (const cabin of CABIN_CLASSES) {
    if (cabin === cabinParam) {
      cabinClass = cabin;
    }
  }

  // Without a full route and a date there is nothing to search yet
  const hasSearch = origin !== "" && destination !== "" && departureDate !== "" && origin !== destination;

  // 2. Page state
  // Start in "loading" when the URL already has a search, so there is no flash of the empty state
  const [status, setStatus] = useState<SearchStatus>(hasSearch ? "loading" : "idle");
  const [result, setResult] = useState<FlightSearchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [filters, setFilters] = useState<FlightFilterState>(EMPTY_FILTERS);
  const [activeTab, setActiveTab] = useState<SortTab>("best");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Bumping this number runs the search again (Refresh and Try again buttons)
  const [refreshCount, setRefreshCount] = useState(0);

  // 3. Search whenever the URL search, the currency or the refresh counter changes
  useEffect(() => {
    if (!hasSearch) {
      setStatus("idle");
      return;
    }

    // A search takes up to ~15 seconds. If the user changes the search meanwhile, the old
    // answer must not replace the new one, so the cleanup below marks this run as stale.
    let isStale = false;

    async function runSearch() {
      setStatus("loading");
      setFilters(EMPTY_FILTERS);
      setVisibleCount(PAGE_SIZE);

      try {
        const data = await searchFlights({
          origin,
          destination,
          departureDate,
          returnDate: returnDate || undefined,
          adults,
          cabinClass,
          currency
        });
        if (isStale) {
          return;
        }
        setResult(data);
        setStatus("done");
      } catch (error) {
        if (isStale) {
          return;
        }
        setErrorMessage(readApiError(error).message);
        setStatus("error");
      }
    }

    runSearch();

    return () => {
      isStale = true;
    };
  }, [hasSearch, origin, destination, departureDate, returnDate, adults, cabinClass, currency, refreshCount]);

  // 4. Handlers
  function handleSearch(values: FlightSearchValues) {
    const next = new URLSearchParams({
      origin: values.origin,
      destination: values.destination,
      departureDate: values.departureDate,
      adults: values.adults,
      cabinClass: values.cabinClass
    });
    if (values.returnDate) {
      next.set("returnDate", values.returnDate);
    }

    // Searching for exactly what is already in the URL changes nothing, so the effect would not
    // run. In that case (for example after an error) bump the counter to search again.
    const isSameSearch =
      values.origin === origin &&
      values.destination === destination &&
      values.departureDate === departureDate &&
      values.returnDate === returnDate &&
      values.adults === String(adults) &&
      values.cabinClass === cabinClass;

    if (isSameSearch) {
      setRefreshCount(refreshCount + 1);
    } else {
      setSearchParams(next);
    }
  }

  function handleSelect(offer: FlightOffer) {
    // The search rides along so the checkout can offer "Search again" if the fare expires
    const next = new URLSearchParams({
      offerId: offer.offerId,
      adults: String(adults),
      origin,
      destination,
      departureDate,
      cabinClass
    });
    if (returnDate) {
      next.set("returnDate", returnDate);
    }
    navigate(`/checkout/flight?${next.toString()}`);
  }

  function handleSortTab(tab: SortTab) {
    setActiveTab(tab);
    setVisibleCount(PAGE_SIZE);
  }

  function handleFilterChange(next: FlightFilterState) {
    setFilters(next);
    setVisibleCount(PAGE_SIZE);
  }

  // 5. Work out what to show
  const allOffers = result ? result.offers : [];
  const filteredOffers = applyFilters(allOffers, filters);
  const shownOffers = sortOffers(filteredOffers, activeTab).slice(0, visibleCount);

  // The earliest expiry in the whole list drives the amber banner
  let earliestExpiry: number | null = null;
  for (const offer of allOffers) {
    const expiresAt = new Date(offer.expiresAt).getTime();
    if (earliestExpiry === null || expiresAt < earliestExpiry) {
      earliestExpiry = expiresAt;
    }
  }

  const formValues: FlightSearchValues = {
    origin,
    destination,
    departureDate,
    returnDate,
    adults: String(adults),
    cabinClass
  };

  let heading = "Find a flight";
  let subheading = "";
  if (hasSearch) {
    heading = `${cityName(origin)} to ${cityName(destination)}`;
    let dates = formatDay(departureDate);
    if (returnDate) {
      dates = `${dates} - ${formatDay(returnDate)}`;
    }
    subheading = `${dates} · ${adultsLabel(adults)} · ${CABIN_LABELS[cabinClass]}`;
  }

  return (
    <div className={styles.div10}>
      {/* The key remounts the form when the URL changes, so it always shows the current search */}
      <FlightSearchForm key={searchParams.toString()} initial={formValues} onSearch={handleSearch} />

      <div className={styles.div11}>
        {status === "idle" ? (
          <MessagePanel
            icon="flight_takeoff"
            title="Where to next?"
            text="Pick a route and dates above to see live fares from airlines."
          />
        ) : (
          <div className={styles.div12}>
            {status === "done" && allOffers.length > 0 ? (
              <FlightFilters offers={allOffers} filters={filters} onChange={handleFilterChange} />
            ) : null}

            <section className={styles.section1}>
              <div className={styles.div13}>
                <div>
                  <h1 className={styles.h11}>{heading}</h1>
                  <p className={styles.p4}>{subheading}</p>
                </div>
                <div className={styles.div14}>
                  <span className={`${styles.span3} material-symbols-outlined`}>schedule</span>
                  <span>All times are local</span>
                </div>
              </div>

              {status === "loading" ? <ResultsSkeleton /> : null}

              {status === "error" ? (
                <MessagePanel
                  icon="error"
                  title="We could not load flights"
                  text={errorMessage}
                  buttonLabel="Try again"
                  onButton={() => setRefreshCount(refreshCount + 1)}
                />
              ) : null}

              {status === "done" && allOffers.length === 0 ? (
                <MessagePanel
                  icon="flights_and_hotels"
                  title="No flights found"
                  text="No airline has fares for this route and date. Try nearby dates or a different cabin."
                />
              ) : null}

              {status === "done" && allOffers.length > 0 ? (
                <>
                  <div className={styles.div15}>
                    {TABS.map((tab) => {
                      const best = sortOffers(filteredOffers, tab.id)[0];
                      const isActive = tab.id === activeTab;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleSortTab(tab.id)}
                          className={isActive ? styles.sortTabOn : styles.sortTabOff}
                        >
                          <span className={styles.span4}>{tab.label}</span>
                          <span className={isActive ? styles.sortTabPriceOn : styles.sortTabPriceOff}>
                            {best
                              ? `${formatMoney(best.price.amount, best.price.currency)} · ${formatMinutes(offerMinutes(best))}`
                              : "-"}
                          </span>
                          {isActive ? <div className={styles.div16} /> : null}
                        </button>
                      );
                    })}
                  </div>

                  {earliestExpiry !== null ? (
                    <PriceExpiryBanner deadline={earliestExpiry} onRefresh={() => setRefreshCount(refreshCount + 1)} />
                  ) : null}

                  <p className={styles.p5}>
                    {filteredOffers.length} {filteredOffers.length === 1 ? "result" : "results"} · Total price for{" "}
                    {adultsLabel(adults)}, taxes included
                  </p>

                  {filteredOffers.length === 0 ? (
                    <MessagePanel
                      icon="filter_alt_off"
                      title="No flights match your filters"
                      text="Remove a filter to see more flights."
                      buttonLabel="Clear filters"
                      onButton={() => handleFilterChange(EMPTY_FILTERS)}
                    />
                  ) : (
                    <div className={styles.div17}>
                      {shownOffers.map((offer) => (
                        <FlightOfferCard key={offer.offerId} offer={offer} adults={adults} onSelect={handleSelect} />
                      ))}
                    </div>
                  )}

                  {filteredOffers.length > visibleCount ? (
                    <div className={styles.div18}>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}
                        className={styles.button2}
                      >
                        Show more results
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
