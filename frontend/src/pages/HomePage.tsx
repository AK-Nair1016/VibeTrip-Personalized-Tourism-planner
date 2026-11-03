import { useEffect, useState } from "react";
import type { Destination } from "@vibetrip/shared-types";
import { fetchDestinations } from "../api/destinations";
import SearchBar from "../components/home/SearchBar";
import DestinationCard from "../components/home/DestinationCard";
import { readApiError } from "../utils/apiError";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Changing this number re-runs the loading effect (used by the Retry button)
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // If the user leaves before the reply arrives, do not set state on a page that is gone
    let cancelled = false;

    async function loadDestinations() {
      setLoading(true);
      setError("");
      try {
        const cities = await fetchDestinations();
        if (!cancelled) {
          setDestinations(cities);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(readApiError(caught).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className={styles.div1}>
      <section className={styles.section1}>
        <h1 className={styles.h11}>
          Plan days, not just tickets.
        </h1>
        <p className={styles.p1}>
          Flights and stays in 10 cities.
        </p>
        <div className={styles.div2}>
          <SearchBar destinations={destinations} />
        </div>
      </section>

      <section className={styles.section2}>
        <h2 className={styles.h21}>Where to next?</h2>

        {loading ? (
          <div className={styles.div3} aria-busy="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className={styles.div4}>
                <div className={styles.div5} />
                <div className={styles.div6} />
                <div className={styles.div7} />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div role="alert" className={styles.div8}>
            <p className={styles.p2}>{error}</p>
            <button
              type="button"
              onClick={() => setAttempt(attempt + 1)}
              className={styles.button1}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && destinations.length === 0 ? (
          <p className={styles.p3}>
            No destinations to show yet.
          </p>
        ) : null}

        {!loading && !error && destinations.length > 0 ? (
          <div className={styles.div3}>
            {destinations.map((destination) => (
              <DestinationCard key={destination.code} destination={destination} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
