import type { ChangeEvent, ReactNode } from "react";

interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  // Red message under the box. Also turns the border red.
  error?: string | null;
  // Small hint under the box, hidden while there is an error
  hint?: string;
  disabled?: boolean;
  // Something on the right inside the box, like the Show/Hide button
  trailing?: ReactNode;
}

// One labelled input in the mock's style: label above, text below, rounded border.
export default function AuthField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  error,
  hint,
  disabled,
  trailing
}: AuthFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  const borderClass = error
    ? "border-error"
    : "border-outline-variant focus-within:border-primary-container";

  let message: ReactNode = null;
  if (error) {
    message = (
      <p id={`${id}-error`} role="alert" className="mt-1 px-1 font-label-sm text-label-sm text-error">
        {error}
      </p>
    );
  } else if (hint) {
    message = <p className="mt-1 px-1 font-label-sm text-label-sm font-normal text-on-surface-variant">{hint}</p>;
  }

  return (
    <div>
      <div
        className={`flex items-center justify-between rounded-xl border bg-surface-container-lowest px-4 py-3 transition-colors ${borderClass}`}
      >
        <div className="mr-2 flex-1">
          <label htmlFor={id} className="block font-label-sm text-label-sm text-on-surface-variant">
            {label}
          </label>
          <input
            id={id}
            name={id}
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="mt-0.5 w-full bg-transparent font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline disabled:opacity-60"
          />
        </div>
        {trailing}
      </div>

      {message}
    </div>
  );
}
