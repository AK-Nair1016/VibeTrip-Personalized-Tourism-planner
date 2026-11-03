import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBookings } from "../api/bookings";
import { readApiError } from "../utils/apiError";
import type { Booking } from "../types/booking";
import BookingCard from "../components/bookings/BookingCard";
import { isUpcoming } from "../components/bookings/bookingFormat";
import styles from "./BookingsPage.module.css";

type Tab = "all" | "upcoming" | "past" | "cancelled";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

// The backend sends everything in one list, so the tabs are worked out here.
// A past stay stays "confirmed" forever on the server, so "past" means the dates are over.
function filterByTab(bookings: Booking[], tab: Tab): Booking[] {
  const result: Booking[] = [];

  for (const booking of bookings) {
    const isCancelled = booking.status === "cancelled";

    if (tab === "all") {
      result.push(booking);
    } else if (tab === "cancelled") {
      if (isCancelled) {
        result.push(booking);
      }
    } else if (tab === "upcoming") {
      if (!isCancelled && isUpcoming(booking)) {
        result.push(booking);
      }
    } else if (!isCancelled && !isUpcoming(booking)) {
      result.push(booking);
    }
  }

  return result;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  // Bumping this number reloads the list (used by the Try again button)
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // StrictMode runs effects twice in development; this flag drops the answer of the first run
    let isCancelled = false;

    async function loadBookings() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const list = await fetchBookings();
        if (!isCancelled) {
          setBookings(list);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(readApiError(error).message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      isCancelled = true;
    };
  }, [reloadCount]);

  const visibleBookings = filterByTab(bookings, tab);

  return (
    <div className={styles.div1}>
      <h1 className={styles.h11}>My trips</h1>
      <p className={styles.p1}>
        Your flights and stays in one place.
      </p>

      <div role="tablist" className={styles.div2}>
        {TABS.map((item) => {
          const isActive = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.id)}
              className={isActive ? styles.tabOn : styles.tabOff}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className={styles.div3}>
        {isLoading && (
          <p className={styles.p2}>
            Loading your trips...
          </p>
        )}

        {!isLoading && errorMessage && (
          <div className={styles.div4}>
            <p className={styles.p3}>{errorMessage}</p>
            <button
              type="button"
              onClick={() => setReloadCount(reloadCount + 1)}
              className={styles.button1}
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && visibleBookings.length === 0 && (
          <div className={styles.div5}>
            <span className={`${styles.span1} material-symbols-outlined`}>luggage</span>
            <h2 className={styles.h21}>
              {tab === "all" ? "No trips yet" : "Nothing in this tab"}
            </h2>
            <p className={styles.p4}>
              {tab === "all"
                ? "When you book a flight or a stay, it will show up here."
                : "Try another tab to see your other trips."}
            </p>
            {tab === "all" && (
              <div className={styles.div6}>
                <Link
                  to="/hotels"
                  className={styles.link1}
                >
                  Find a stay
                </Link>
                <Link
                  to="/flights"
                  className={styles.link2}
                >
                  Search flights
                </Link>
              </div>
            )}
          </div>
        )}

        {!isLoading &&
          !errorMessage &&
          visibleBookings.map((booking) => <BookingCard key={booking._id} booking={booking} />)}
      </div>
    </div>
  );
}
