import type { ReactNode } from "react";

// Shared look for the inputs inside the pill-shaped search bars.
export const searchInputClass =
  "w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none disabled:text-on-surface-variant";

interface SearchFieldProps {
  label: string;
  children: ReactNode;
  // Tailwind width classes; fields share the row equally unless one is told to be narrow
  className?: string;
}

// One labelled segment of the search bar. The <label> wraps the input, so clicking
// anywhere on the segment focuses it.
export default function SearchField({ label, children, className = "flex-1" }: SearchFieldProps) {
  return (
    <label
      className={`flex min-w-0 flex-col justify-center rounded-full px-5 py-2 transition hover:bg-surface-container-low ${className}`}
    >
      <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface">{label}</span>
      {children}
    </label>
  );
}

// The thin line between two segments (only on wide screens, where they sit side by side)
export function SearchDivider() {
  return <div className="hidden h-8 w-px shrink-0 bg-outline-variant md:block" />;
}
