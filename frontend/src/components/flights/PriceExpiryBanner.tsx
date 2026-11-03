import { useSecondsLeft } from "./useSecondsLeft";

interface PriceExpiryBannerProps {
  deadline: number; // when the earliest fare in the list expires (milliseconds since 1970)
  onRefresh: () => void;
}

// The amber strip above the results. Own component so the once-a-second tick
// redraws only this strip, not the whole list.
export default function PriceExpiryBanner({ deadline, onRefresh }: PriceExpiryBannerProps) {
  const secondsLeft = useSecondsLeft(deadline) ?? 0;

  let text = "Some of these fares may have expired. Refresh to see live prices.";
  if (secondsLeft > 0) {
    const minutes = Math.ceil(secondsLeft / 60);
    text = `Prices change fast. The earliest of these fares expires in ${minutes} min.`;
  }

  return (
    <div className="mt-space-sm flex items-center justify-between gap-space-sm rounded-xl border border-[#FDE68A] bg-[#FFF7E6] px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-[#B45309]">
        <span className="material-symbols-outlined text-[20px]">schedule</span>
        <span className="text-[14px] font-medium">{text}</span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#B45309] px-3 py-1.5 text-xs font-semibold text-[#B45309] transition-colors hover:bg-amber-100"
      >
        <span className="material-symbols-outlined text-[16px]">refresh</span>
        Refresh
      </button>
    </div>
  );
}
