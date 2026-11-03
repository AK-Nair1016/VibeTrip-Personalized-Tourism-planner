import { useEffect, useState } from "react";

// Counts down to a deadline (milliseconds since 1970). Returns whole seconds left, never below 0.
// Returns null while there is no deadline yet.
// Each tick re-reads the clock instead of subtracting 1, so a sleeping tab cannot drift.
export function useSecondsLeft(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) {
      return;
    }

    setNow(Date.now());
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [deadline]);

  if (deadline === null) {
    return null;
  }

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

// 754 -> "12:34"
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
