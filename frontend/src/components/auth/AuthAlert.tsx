import type { ReactNode } from "react";

interface AuthAlertProps {
  kind: "error" | "success";
  children: ReactNode;
}

// A boxed message for the whole form (server errors, "email sent").
export default function AuthAlert({ kind, children }: AuthAlertProps) {
  const colorClass =
    kind === "error"
      ? "border-error text-error"
      : "border-primary-container bg-primary-fixed text-on-primary-fixed";
  const role = kind === "error" ? "alert" : "status";

  return (
    <div role={role} className={`rounded-xl border p-3.5 font-label-md text-label-md ${colorClass}`}>
      {children}
    </div>
  );
}
