import { useState } from "react";
import { cancelBooking, createCancellationQuote } from "../../api/bookings";
import { readApiError } from "../../utils/apiError";
import type { BookingDetail, CancellationQuote } from "../../types/booking";
import { formatMoney } from "../../utils/formatMoney";
import { formatInstant } from "./bookingFormat";

interface CancelPanelProps {
  booking: BookingDetail;
  // Called after a cancel (or when the server says it is already cancelled), so the page reloads the booking
  onChanged: () => void;
}

const primaryDanger =
  "w-full rounded-xl bg-error px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-error hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "w-full rounded-xl border border-outline-variant px-space-md py-2.5 font-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60";

// The cancel area under the payment card. Always asks for a confirm step before cancelling.
// Flights: quote first (what you get back), then confirm. Hotels: warn about the late fee, then confirm.
export default function CancelPanel({ booking, onChanged }: CancelPanelProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Only a confirmed booking can be cancelled
  if (booking.status !== "confirmed") {
    return null;
  }

  function keepBooking() {
    setIsConfirming(false);
    setQuote(null);
    setErrorMessage("");
  }

  // Runs the final POST /cancel for both kinds of booking
  async function confirmCancel() {
    setIsWorking(true);
    setErrorMessage("");

    try {
      await cancelBooking(booking._id);
      keepBooking();
      onChanged();
    } catch (error) {
      const info = readApiError(error);
      setErrorMessage(info.message);

      if (info.code === "QUOTE_REQUIRED") {
        // The quote ran out or is missing: ask the user to get a fresh one
        setQuote(null);
      }
      if (info.code === "NOT_CANCELLABLE" || info.code === "STAY_STARTED") {
        // The booking changed under us (cancelled in another tab, or the stay began): show the truth
        onChanged();
      }
    } finally {
      setIsWorking(false);
    }
  }

  // Flights, step 1: ask what the refund would be
  async function askForQuote() {
    setIsWorking(true);
    setErrorMessage("");

    try {
      const newQuote = await createCancellationQuote(booking._id);
      setQuote(newQuote);
      setIsConfirming(true);
    } catch (error) {
      const info = readApiError(error);
      setErrorMessage(info.message);
      if (info.code === "NOT_CANCELLABLE") {
        onChanged();
      }
    } finally {
      setIsWorking(false);
    }
  }

  const errorBox = errorMessage ? (
    <p role="alert" className="mt-space-sm rounded-lg bg-error-container p-space-sm font-label-md text-label-md text-on-error-container">
      {errorMessage}
    </p>
  ) : null;

  // ---------- Hotels ----------
  if (booking.type === "hotel") {
    const snapshot = booking.snapshot;
    const stayStarted = Date.now() >= Date.parse(snapshot.checkIn);
    // Same rule as the server: the fee applies from freeCancelUntil onwards
    const isLate = Date.now() >= Date.parse(snapshot.freeCancelUntil);
    const lateFee = formatMoney(snapshot.lateCancelFee.amount, snapshot.lateCancelFee.currency);

    if (stayStarted) {
      return (
        <p className="mt-space-md rounded-lg bg-surface-container-low p-space-sm font-label-md text-label-md text-on-surface-variant">
          This stay has started, so it can no longer be cancelled online.
        </p>
      );
    }

    if (!isConfirming) {
      return (
        <div className="mt-space-md">
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="w-full rounded-xl border border-error py-2.5 font-label-md text-label-md font-semibold text-error hover:bg-error-container"
          >
            Cancel booking
          </button>
          {errorBox}
        </div>
      );
    }

    let confirmLabel = "Yes, cancel booking";
    if (isWorking) {
      confirmLabel = "Cancelling...";
    } else if (isLate) {
      confirmLabel = `Cancel and pay ${lateFee}`;
    }

    return (
      <div className="mt-space-md space-y-space-sm rounded-xl border border-outline-variant p-space-md">
        <h3 className="font-title text-title text-on-surface">Cancel this stay?</h3>
        {isLate ? (
          <p className="rounded-lg bg-[#FFF7E6] p-space-sm font-body-sm text-body-sm text-[#B45309]">
            Free cancellation ended on {formatInstant(snapshot.freeCancelUntil)}. If you cancel now, a late fee of{" "}
            <strong>{lateFee}</strong> will be charged to the card you saved when you booked.
          </p>
        ) : (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Free cancellation is still open until {formatInstant(snapshot.freeCancelUntil)}. Nothing will be
            charged.
          </p>
        )}
        <button type="button" onClick={confirmCancel} disabled={isWorking} className={primaryDanger}>
          {confirmLabel}
        </button>
        <button type="button" onClick={keepBooking} disabled={isWorking} className={secondaryButton}>
          Keep my booking
        </button>
        {errorBox}
      </div>
    );
  }

  // ---------- Flights ----------
  // liveStatus is null when Duffel is down; then we let the server decide
  const liveStatus = booking.liveStatus;
  if (liveStatus && !liveStatus.availableActions.includes("cancel")) {
    return (
      <p className="mt-space-md rounded-lg bg-surface-container-low p-space-sm font-label-md text-label-md text-on-surface-variant">
        This fare can no longer be cancelled online. Contact the airline for changes.
      </p>
    );
  }

  if (!isConfirming || !quote) {
    return (
      <div className="mt-space-md">
        <button
          type="button"
          onClick={askForQuote}
          disabled={isWorking}
          className="w-full rounded-xl border border-error py-2.5 font-label-md text-label-md font-semibold text-error hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isWorking ? "Checking refund..." : "Cancel booking"}
        </button>
        {errorBox}
      </div>
    );
  }

  const refundText = formatMoney(quote.refundAmount, quote.currency);

  return (
    <div className="mt-space-md space-y-space-sm rounded-xl border border-outline-variant p-space-md">
      <h3 className="font-title text-title text-on-surface">Cancel this flight?</h3>
      {quote.refundAmount > 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          If you cancel, you get <strong className="text-on-surface">{refundText}</strong> back on your card.
        </p>
      ) : (
        <p className="rounded-lg bg-[#FFF7E6] p-space-sm font-body-sm text-body-sm text-[#B45309]">
          This fare is non-refundable. If you cancel, you get nothing back.
        </p>
      )}
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        This quote is valid until {formatInstant(quote.expiresAt)}.
      </p>
      <button type="button" onClick={confirmCancel} disabled={isWorking} className={primaryDanger}>
        {isWorking ? "Cancelling..." : "Yes, cancel flight"}
      </button>
      <button type="button" onClick={keepBooking} disabled={isWorking} className={secondaryButton}>
        Keep my booking
      </button>
      {errorBox}
    </div>
  );
}
