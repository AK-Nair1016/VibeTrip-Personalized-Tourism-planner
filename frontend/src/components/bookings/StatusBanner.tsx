import { useState } from "react";
import type { BookingDetail, MoneyStepStatus } from "../../types/booking";
import { formatMoney } from "../../utils/formatMoney";

interface StatusBannerProps {
  booking: BookingDetail;
  // The message from GET /bookings/:id/status while polling
  liveMessage: string;
  isPolling: boolean;
  timedOut: boolean;
}

interface BannerText {
  icon: string;
  label: string;
  title: string;
  body: string;
}

function refundSentence(booking: BookingDetail): string {
  const amount = booking.refundAmount ?? 0;
  const currency = booking.refundCurrency ?? booking.currency;
  const money = formatMoney(amount, currency);
  const refundStatus: MoneyStepStatus | undefined = booking.refundStatus;

  if (amount === 0) {
    return "This fare was non-refundable, so there is no refund.";
  }
  if (refundStatus === "succeeded") {
    return `Your refund of ${money} is on its way to your card.`;
  }
  if (refundStatus === "failed") {
    return `Your flight is cancelled, but the refund of ${money} did not go through. We will sort it out with you.`;
  }
  return `Your refund of ${money} is being processed.`;
}

function feeSentence(booking: BookingDetail): string {
  const fee = booking.cancellationFee ?? 0;

  if (fee === 0) {
    return "You cancelled in time, so nothing was charged.";
  }

  const money = formatMoney(fee, booking.currency);
  if (booking.cancellationFeeStatus === "succeeded") {
    return `You cancelled after the free cancellation deadline, so the late fee of ${money} was charged to your saved card.`;
  }
  if (booking.cancellationFeeStatus === "failed") {
    return `You cancelled after the free cancellation deadline. We could not charge the late fee of ${money} to your saved card, so the hotel may contact you.`;
  }
  return `You cancelled after the free cancellation deadline. The late fee of ${money} is being charged to your saved card.`;
}

function pickText(props: StatusBannerProps): BannerText {
  const { booking, liveMessage, timedOut } = props;
  const isHotel = booking.type === "hotel";

  if (booking.status === "confirmed") {
    return {
      icon: "check_circle",
      label: "Confirmed",
      title: "Booking confirmed",
      body: isHotel
        ? "Your room is booked. Pay at the hotel when you stay. Nothing was charged now."
        : "Your flight is booked. We will email your confirmation shortly.",
    };
  }

  if (booking.status === "cancelled") {
    return {
      icon: "close",
      label: "Cancelled",
      title: "Booking cancelled",
      body: isHotel ? feeSentence(booking) : refundSentence(booking),
    };
  }

  if (booking.status === "failed") {
    return {
      icon: "error",
      label: "Not completed",
      title: "Booking unsuccessful",
      body:
        liveMessage ||
        "The booking could not be completed and you were not charged. If your bank shows a pending hold, it releases it within a few days.",
    };
  }

  if (booking.status === "authorized") {
    return {
      icon: "hourglass_top",
      label: "Confirming",
      title: timedOut ? "Still confirming your booking" : "Confirming your booking",
      body: timedOut
        ? "This is taking longer than usual. Your payment is held, not taken. You can leave this page and check My trips later."
        : liveMessage || "Payment received, we are confirming your booking. You can safely leave this page.",
    };
  }

  return {
    icon: "hourglass_top",
    label: "Awaiting payment",
    title: timedOut ? "Still waiting for your payment" : "Waiting for your payment",
    body: timedOut
      ? "We have not heard from your bank yet. If you were charged, check My trips in a few minutes."
      : liveMessage || "We are waiting for your payment to go through.",
  };
}

// One step of the flight progress bar
interface Step {
  title: string;
  sub: string;
  state: "done" | "current" | "todo" | "bad";
}

// The three steps a flight goes through: card hold, ticket from the airline, final state
function flightSteps(booking: BookingDetail): Step[] {
  const status = booking.status;

  if (status === "pending_payment") {
    return [
      { title: "Payment held", sub: "Waiting for your card", state: "current" },
      { title: "Ticket issued", sub: "Next", state: "todo" },
      { title: "Confirmed", sub: "Next", state: "todo" },
    ];
  }
  if (status === "authorized") {
    return [
      { title: "Payment held", sub: "Card hold placed", state: "done" },
      { title: "Ticket issued", sub: "Asking the airline", state: "current" },
      { title: "Confirmed", sub: "Next", state: "todo" },
    ];
  }
  if (status === "failed") {
    return [
      { title: "Payment held", sub: "Hold released", state: "done" },
      { title: "Declined by airline", sub: "Booking unsuccessful", state: "bad" },
      { title: "Confirmed", sub: "Not reached", state: "todo" },
    ];
  }
  if (status === "cancelled") {
    return [
      { title: "Payment held", sub: "Done", state: "done" },
      { title: "Ticket issued", sub: "Done", state: "done" },
      { title: "Cancelled", sub: "Refund initiated", state: "done" },
    ];
  }
  return [
    { title: "Payment held", sub: "Done", state: "done" },
    { title: "Ticket issued", sub: "Done", state: "done" },
    { title: "Confirmed", sub: "You are all set", state: "done" },
  ];
}

function barColour(state: Step["state"]): string {
  if (state === "done") {
    return "bg-primary-container";
  }
  if (state === "bad") {
    return "bg-error";
  }
  if (state === "current") {
    return "animate-pulse bg-primary-fixed-dim";
  }
  return "bg-surface-container-high";
}

export default function StatusBanner(props: StatusBannerProps) {
  const { booking, isPolling } = props;
  const [copied, setCopied] = useState(false);
  const text = pickText(props);

  const isBad = booking.status === "failed";
  const isWaiting = booking.status === "pending_payment" || booking.status === "authorized";
  const iconColour = isBad ? "text-error" : "text-primary-container";

  async function copyReference() {
    if (!booking.bookingReference) {
      return;
    }
    try {
      await navigator.clipboard.writeText(booking.bookingReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copying is a nicety; if the browser refuses, the reference is still on screen
    }
  }

  return (
    <>
      <section
        aria-live="polite"
        className="mb-space-lg w-full rounded-xl border border-outline-variant bg-surface-container-low p-space-lg shadow-sm"
      >
        <div className="flex flex-col justify-between gap-space-lg md:flex-row md:items-center">
          <div className="flex items-start gap-space-md">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest ${iconColour}`}
            >
              <span className={`material-symbols-outlined text-[26px] ${isWaiting && isPolling ? "animate-pulse" : ""}`}>
                {text.icon}
              </span>
            </div>
            <div className="space-y-space-xs">
              <span className="font-label-sm text-label-sm font-extrabold uppercase tracking-wider text-on-surface-variant">
                {text.label}
              </span>
              <h1 className="font-headline-md text-headline-md text-on-surface">{text.title}</h1>
              <p className="font-body-default text-body-default text-on-surface-variant">{text.body}</p>
            </div>
          </div>

          {booking.bookingReference && (
            <div className="flex shrink-0 items-center justify-between gap-space-md rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md py-space-sm md:justify-start">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Booking reference
                </span>
                <span className="font-price-tabular text-price-tabular tracking-wider text-on-surface">
                  {booking.bookingReference}
                </span>
              </div>
              <button
                type="button"
                aria-label="Copy booking reference"
                onClick={copyReference}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[18px]">{copied ? "check" : "content_copy"}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {booking.type === "flight" && (
        <section aria-label="Booking progress" className="mb-space-xl w-full">
          <div className="mb-space-xs grid grid-cols-3 gap-space-sm">
            {flightSteps(booking).map((step) => (
              <div key={step.title} className={`h-2 rounded-full ${barColour(step.state)}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-space-sm text-left">
            {flightSteps(booking).map((step) => (
              <div key={step.title}>
                <span className="block font-label-md text-label-md font-bold text-on-surface">{step.title}</span>
                <span
                  className={`font-label-sm text-label-sm ${step.state === "bad" ? "font-semibold text-error" : "text-on-surface-variant"}`}
                >
                  {step.sub}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
