import type { BookingStatus } from "../../types/booking";
import { statusPill } from "./bookingFormat";

export default function StatusPill({ status }: { status: BookingStatus }) {
  const pill = statusPill(status);

  return (
    <span className={`rounded-full px-space-sm py-0.5 font-label-sm text-label-sm font-bold ${pill.className}`}>
      {pill.label}
    </span>
  );
}
