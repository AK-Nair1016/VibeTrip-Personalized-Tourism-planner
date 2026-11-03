import { Link } from "react-router-dom";

interface FareExpiredModalProps {
  searchHref: string; // /flights with the previous search, so the traveller does not retype it
}

// Covers the page when the fare is gone (409 FARE_EXPIRED) or the hold timer ran out.
export default function FareExpiredModal({ searchHref }: FareExpiredModalProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fare-expired-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-[420px] rounded-[20px] bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2]">
          <span className="material-symbols-outlined text-[24px] text-[#DC2626]">schedule</span>
        </div>
        <h2 id="fare-expired-title" className="mb-2 text-headline-sm text-on-surface">
          This fare has expired
        </h2>
        <p className="mb-6 text-[15px] leading-relaxed text-on-surface-variant">
          Airlines hold prices for a short time. Nothing was charged.
        </p>
        <Link
          to={searchHref}
          className="block w-full rounded-xl bg-primary-container px-4 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-95"
        >
          Search again
        </Link>
      </div>
    </div>
  );
}
