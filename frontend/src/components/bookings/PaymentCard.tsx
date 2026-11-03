import type { ReactNode } from "react";
import type { BookingDetail, MoneyStepStatus } from "../../types/booking";
import { formatMoney } from "../../utils/formatMoney";
import { formatCreatedAt } from "./bookingFormat";

interface PaymentCardProps {
  booking: BookingDetail;
  // The cancel area goes under the payment details
  children?: ReactNode;
}

interface Row {
  label: string;
  value: string;
}

// A fee or refund is "pending" until the card step finishes, then "succeeded" or "failed"
function moneyStepText(status: MoneyStepStatus, succeededText: string, failedText: string): string {
  if (status === "succeeded") {
    return succeededText;
  }
  if (status === "failed") {
    return failedText;
  }
  return "Processing";
}

export default function PaymentCard({ booking, children }: PaymentCardProps) {
  const isHotel = booking.type === "hotel";
  const total = formatMoney(booking.totalAmount, booking.currency);

  // Name and note of the big number depend on what the money really did
  let totalLabel = "Total";
  let totalNote = "";
  let footnote = "";

  if (isHotel) {
    totalLabel = "Total to pay at the hotel";
    totalNote = booking.status === "cancelled" ? "Cancelled" : "Not charged now";
    footnote =
      "Your card is only a guarantee. It is charged only if you cancel after the free cancellation deadline.";
  } else if (booking.status === "confirmed") {
    totalLabel = "Total paid";
    totalNote = "Paid";
    footnote = "Prices are shown in the currency you paid in.";
  } else if (booking.status === "authorized") {
    totalLabel = "Total held on your card";
    totalNote = "Hold active";
    footnote = "Your payment is taken once the airline issues your tickets.";
  } else if (booking.status === "failed") {
    totalLabel = "Total";
    totalNote = "Not charged";
    footnote = "No money was taken for this booking.";
  } else if (booking.status === "cancelled") {
    totalLabel = "Total";
    totalNote = "Cancelled";
  } else {
    totalLabel = "Total to pay";
    totalNote = "Awaiting payment";
  }

  const rows: Row[] = [];
  rows.push({ label: "Booked on", value: formatCreatedAt(booking.createdAt) });

  // Hotel late fee, only after a cancel
  if (isHotel && booking.status === "cancelled") {
    const fee = booking.cancellationFee ?? 0;
    rows.push({ label: "Late cancellation fee", value: fee === 0 ? "None" : formatMoney(fee, booking.currency) });
    if (fee > 0 && booking.cancellationFeeStatus) {
      rows.push({ label: "Fee status", value: moneyStepText(booking.cancellationFeeStatus, "Charged", "Could not be charged") });
    }
  }

  // Flight refund, only after a cancel
  if (!isHotel && booking.status === "cancelled" && booking.refundAmount !== undefined) {
    rows.push({
      label: "Refund",
      value: formatMoney(booking.refundAmount, booking.refundCurrency ?? booking.currency),
    });
    if (booking.refundStatus) {
      rows.push({
        label: "Refund status",
        value: moneyStepText(booking.refundStatus, "Sent to your card", "Failed, we will follow up"),
      });
    }
  }

  return (
    <div className="flex flex-col rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <div className="mb-space-md flex items-center justify-between">
        <h2 className="font-title text-title text-on-surface">Payment details</h2>
        <span className="material-symbols-outlined text-[18px] text-primary-container">payments</span>
      </div>

      <div className="mb-space-md rounded-lg bg-surface-container-low p-space-md">
        <span className="mb-0.5 block font-label-sm text-label-sm text-on-surface-variant">{totalLabel}</span>
        <div className="flex items-baseline justify-between gap-space-sm">
          <span className="font-headline-md text-headline-md text-on-surface">{total}</span>
          <span className="font-label-sm text-label-sm font-bold text-primary-container">{totalNote}</span>
        </div>
      </div>

      <div className="space-y-space-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-space-sm py-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">{row.label}</span>
            <span className="text-right font-label-md text-label-md font-semibold text-on-surface">{row.value}</span>
          </div>
        ))}
      </div>

      {footnote && (
        <div className="mt-space-md flex items-start gap-space-xs rounded-lg bg-surface-container-low p-space-sm">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-primary-container">info</span>
          <p className="font-label-sm text-label-sm leading-relaxed text-on-surface-variant">{footnote}</p>
        </div>
      )}

      {children}
    </div>
  );
}
