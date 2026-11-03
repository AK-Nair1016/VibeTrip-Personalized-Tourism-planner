import type { ReactNode } from "react";
import coverImage from "../../assets/cover.jpg";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  // Text on the card that floats over the photo panel
  panelTitle?: string;
  panelText?: string;
  children: ReactNode;
}

// The frame shared by every auth page: a teal panel on the left (large screens only)
// and the form on the right. The top bar comes from Layout, so it is not repeated here.
export default function AuthShell({
  title,
  subtitle,
  panelTitle = "10 cities. One account.",
  panelText = "Save stays, keep travellers on file, see every trip day by day.",
  children
}: AuthShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] gap-space-lg p-space-md">
      <div className="relative hidden flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-container to-primary p-space-xl lg:flex lg:w-[55%]">
        {/* Photo fills the panel; object-cover crops it to fit. Empty alt: it is decoration only. */}
        <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />

        {/* relative keeps the card above the absolutely placed photo */}
        <div className="relative w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-lg">
          <p className="font-title text-title text-on-surface">{panelTitle}</p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{panelText}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-space-md py-space-lg">
        <div className="w-full max-w-[420px]">
          <h1 className="font-headline-md text-headline-md text-on-surface">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 font-body-medium text-body-sm text-on-surface-variant">{subtitle}</p>
          ) : null}
          <div className="mt-space-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}
