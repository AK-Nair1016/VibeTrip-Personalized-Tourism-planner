import type { ReactNode } from "react";

interface AuthButtonProps {
  children: ReactNode;
  // True while the request runs: the button is disabled and shows loadingText
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

// The big teal submit button. Disabled while loading so a double click cannot send twice.
export default function AuthButton({ children, isLoading, loadingText = "Please wait...", disabled }: AuthButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-primary-container font-label-md text-label-md text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? loadingText : children}
    </button>
  );
}
