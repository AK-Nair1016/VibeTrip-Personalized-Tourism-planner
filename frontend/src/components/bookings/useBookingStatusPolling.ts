import { useEffect, useRef, useState } from "react";
import { fetchBookingStatus } from "../../api/bookings";
import type { BookingStatus, BookingStatusInfo } from "../../types/booking";

const POLL_EVERY_MS = 3000;
// About 2.5 minutes. A booking whose payment capture failed stays "authorized" for a manual fix,
// so we must stop asking at some point and tell the user to check back.
const MAX_POLLS = 50;

// Once a booking reaches one of these, nothing more will change on its own
const FINAL_STATUSES: BookingStatus[] = ["confirmed", "failed", "cancelled"];

export function isFinalStatus(status: BookingStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

interface PollingResult {
  latest: BookingStatusInfo | null;
  timedOut: boolean;
}

// Asks GET /bookings/:id/status every 3 seconds while `enabled` is true. It stops on a final status
// (and calls onSettled once), after MAX_POLLS tries, or when the page closes.
export function useBookingStatusPolling(
  bookingId: string,
  enabled: boolean,
  onSettled: (info: BookingStatusInfo) => void
): PollingResult {
  const [latest, setLatest] = useState<BookingStatusInfo | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Keep the newest callback in a ref, so a new function each render does not restart the timer
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // `stopped` and the timer are cleaned up when the page closes. StrictMode also runs this
    // effect twice in development, and the flag makes the first run harmless.
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pollCount = 0;

    async function poll() {
      pollCount = pollCount + 1;

      try {
        const info = await fetchBookingStatus(bookingId);
        if (stopped) {
          return;
        }
        setLatest(info);

        if (isFinalStatus(info.status)) {
          onSettledRef.current(info);
          return;
        }
      } catch {
        // One failed request (a network blip, a refresh in progress) should not end the polling
      }

      // A request that failed after the page closed must not start a new timer
      if (stopped) {
        return;
      }

      if (pollCount >= MAX_POLLS) {
        setTimedOut(true);
        return;
      }

      timer = setTimeout(poll, POLL_EVERY_MS);
    }

    setTimedOut(false);
    poll();

    return () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [bookingId, enabled]);

  return { latest, timedOut };
}
