import { Link } from "react-router-dom";
import type { Booking } from "../../types/booking";
import { formatMoney } from "../../utils/formatMoney";
import { bookingStartDate, formatRoute } from "./bookingFormat";
import StatusPill from "./StatusPill";

// One row of the My trips list. The whole card is a link to the booking page.
export default function BookingCard({ booking }: { booking: Booking }) {
  const isHotel = booking.type === "hotel";
  const icon = isHotel ? "hotel" : "flight_takeoff";
  const typeLabel = isHotel ? "Stay" : "Flight";

  // One line of detail under the title
  let detail = "";
  if (booking.type === "hotel") {
    const snapshot = booking.snapshot;
    const nightWord = snapshot.nights === 1 ? "night" : "nights";
    detail = `${snapshot.city} · ${snapshot.nights} ${nightWord} · ${snapshot.roomType}`;
  } else {
    const tripKind = booking.snapshot.slices.length > 1 ? "Round trip" : "One way";
    detail = `${booking.snapshot.airline} · ${tripKind}`;
  }

  return (
    <Link
      to={`/bookings/${booking._id}`}
      className="flex flex-col gap-space-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-space-lg transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-space-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary-container">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="space-y-space-xs">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              {typeLabel}
            </span>
            <StatusPill status={booking.status} />
          </div>
          <h2 className="font-title text-title text-on-surface">{formatRoute(booking)}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{detail}</p>
          <p className="font-label-md text-label-md text-on-surface-variant">
            {bookingStartDate(booking)}
            {booking.bookingReference ? ` · Ref ${booking.bookingReference}` : ""}
          </p>
        </div>
      </div>

      <div className="text-left sm:text-right">
        <span className="block font-price-tabular text-price-tabular text-on-surface">
          {formatMoney(booking.totalAmount, booking.currency)}
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {isHotel ? "Pay at the hotel" : "Total"}
        </span>
      </div>
    </Link>
  );
}
