// The server gives an unpaid flight checkout 15 minutes from when the BOOKING was created.
// The POST answer does not say when that was, so the browser remembers the time of the first
// successful POST per offer. After a reload the same POST returns the same booking, and the
// countdown then continues from the stored time instead of restarting at 15:00.
export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

const KEY_PREFIX = "vibetrip.flightCheckoutStart.";

// A non-secret timestamp, so sessionStorage is fine (it is per tab and gone when the tab closes).
// Storage can throw (private mode, disabled), so every use is wrapped: the timer just restarts.
function storageKey(offerId: string): string {
  return `${KEY_PREFIX}${offerId}`;
}

// The stored start, only while its 15 minutes are still running. A start older than that belongs
// to a booking the server has already let go, so it is ignored.
export function readCheckoutStart(offerId: string): number | null {
  try {
    const saved = sessionStorage.getItem(storageKey(offerId));
    if (saved === null) {
      return null;
    }

    const startedAt = Number(saved);
    if (!Number.isFinite(startedAt) || startedAt + PAYMENT_WINDOW_MS <= Date.now()) {
      return null;
    }
    return startedAt;
  } catch {
    return null;
  }
}

// Call after a successful POST. Keeps an earlier start that is still running (same booking
// returned again), otherwise saves "now". Returns the start to count from.
export function rememberCheckoutStart(offerId: string): number {
  const existing = readCheckoutStart(offerId);
  if (existing !== null) {
    return existing;
  }

  const now = Date.now();
  try {
    sessionStorage.setItem(storageKey(offerId), String(now));
  } catch {
    // Not saving only means a reload restarts the timer
  }
  return now;
}
