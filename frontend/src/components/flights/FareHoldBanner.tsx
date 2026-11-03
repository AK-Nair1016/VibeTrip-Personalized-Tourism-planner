import { formatCountdown } from "./useSecondsLeft";

interface FareHoldBannerProps {
  secondsLeft: number;
}

// Teal while there is plenty of time, amber for the last 5 minutes (both are in the mock).
const WARNING_SECONDS = 5 * 60;

export default function FareHoldBanner({ secondsLeft }: FareHoldBannerProps) {
  const isUrgent = secondsLeft <= WARNING_SECONDS;

  const boxClass = isUrgent
    ? "border border-[#FDE68A] bg-[#FFF7E6] text-[#B45309]"
    : "bg-secondary-container/40 text-primary-container";
  const dotClass = isUrgent ? "bg-[#B45309]" : "bg-primary-container";

  return (
    <div className={`flex items-center justify-between rounded-xl p-3.5 sm:px-4 ${boxClass}`}>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined shrink-0 text-[20px]">timer</span>
        <div className="flex items-center gap-2">
          <span className="text-label-md">We're holding this fare for</span>
          <span className="text-label-md tracking-tight">{formatCountdown(secondsLeft)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 animate-pulse rounded-full ${dotClass}`} />
        <span className="hidden text-label-sm sm:inline">Price locked</span>
      </div>
    </div>
  );
}
