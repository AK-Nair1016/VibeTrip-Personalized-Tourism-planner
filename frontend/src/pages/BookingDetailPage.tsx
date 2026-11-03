import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchBooking } from "../api/bookings";
import { readApiError } from "../utils/apiError";
import type { BookingDetail } from "../types/booking";
import CancelPanel from "../components/bookings/CancelPanel";
import FlightSummary from "../components/bookings/FlightSummary";
import HotelSummary from "../components/bookings/HotelSummary";
import PaymentCard from "../components/bookings/PaymentCard";
import ReviewForm from "../components/bookings/ReviewForm";
import StatusBanner from "../components/bookings/StatusBanner";
import { useBookingStatusPolling } from "../components/bookings/useBookingStatusPolling";
import styles from "./BookingDetailPage.module.css";

function BookingDetailContent({ bookingId }: { bookingId: string }) {
  // Flight checkout sends the user here with ?paid=1 right after the card is confirmed
  const [searchParams] = useSearchParams();
  const cameFromPayment = searchParams.get("paid") === "1";

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  // Bumping this number loads the booking again (after a cancel, or when the status becomes final)
  const [reloadCount, setReloadCount] = useState(0);
  // True once polling has seen a final status, so it never starts again
  const [hasSettled, setHasSettled] = useState(false);

  useEffect(() => {
    // StrictMode runs effects twice in development; this flag drops the answer of the first run
    let isCancelled = false;

    async function loadBooking() {
      try {
        const loaded = await fetchBooking(bookingId);
        if (!isCancelled) {
          setBooking(loaded);
          setErrorMessage("");
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

    loadBooking();

    return () => {
      isCancelled = true;
    };
  }, [bookingId, reloadCount]);

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  const handleSettled = useCallback(() => {
    setHasSettled(true);
    // The status call only knows the status; the booking itself now has the reference and live details
    reload();
  }, [reload]);

  const isWaitingForResult =
    booking !== null && (booking.status === "pending_payment" || booking.status === "authorized");
  const shouldPoll = booking !== null && !hasSettled && (cameFromPayment || isWaitingForResult);

  const { latest, timedOut } = useBookingStatusPolling(bookingId, shouldPoll, handleSettled);

  return (
    <div className={styles.div1}>
      <div className={styles.div2}>
        <Link
          to="/bookings"
          className={styles.link1}
        >
          <span className={`${styles.span1} material-symbols-outlined`}>arrow_back</span>
          <span className={styles.span2}>All trips</span>
        </Link>
      </div>

      {isLoading && (
        <p className={styles.p1}>
          Loading your booking...
        </p>
      )}

      {!isLoading && !booking && (
        <div className={styles.div3}>
          <p className={styles.p2}>{errorMessage || "We could not load this booking."}</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              reload();
            }}
            className={styles.button1}
          >
            Try again
          </button>
        </div>
      )}

      {booking && (
        <>
          <StatusBanner
            booking={booking}
            liveMessage={latest ? latest.message : ""}
            isPolling={shouldPoll}
            timedOut={timedOut}
          />

          {(booking.status === "failed" || booking.status === "cancelled") && (
            <div className={styles.div4}>
              <Link
                to={booking.type === "hotel" ? "/hotels" : "/flights"}
                className={styles.link2}
              >
                {booking.type === "hotel" ? "Find another stay" : "Search flights again"}
              </Link>
            </div>
          )}

          <div className={styles.div5}>
            <div className={styles.div6}>
              {booking.type === "hotel" ? (
                <HotelSummary booking={booking} />
              ) : (
                <FlightSummary booking={booking} liveStatus={booking.liveStatus} />
              )}
            </div>

            <div className={styles.div7}>
              <PaymentCard booking={booking}>
                <CancelPanel booking={booking} onChanged={reload} />
              </PaymentCard>
            </div>
          </div>

          {booking.type === "hotel" && booking.status === "confirmed" && (
            <ReviewForm bookingId={booking._id} hotelName={booking.snapshot.hotelName} />
          )}
        </>
      )}
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams();

  if (!id) {
    return <div className={styles.div8}>Booking not found.</div>;
  }

  // The key makes React start fresh when the id in the address changes
  return <BookingDetailContent key={id} bookingId={id} />;
}
