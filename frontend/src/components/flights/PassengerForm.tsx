import type { ReactNode } from "react";
import type { PassengerInput } from "@vibetrip/shared-types";
import { todayString } from "./flightFormat";
import { GENDER_OPTIONS, TITLE_OPTIONS, type PassengerErrors } from "./passengerValidation";

interface PassengerFormProps {
  index: number; // 0 for the first traveller
  passenger: PassengerInput;
  errors: PassengerErrors;
  onChange: (field: keyof PassengerInput, value: string) => void;
}

const inputClass =
  "w-full rounded-lg border bg-surface-container-lowest px-3.5 py-3 text-body-sm text-on-surface focus:outline-none";

function inputBorder(hasError: boolean): string {
  if (hasError) {
    return "border-error";
  }
  return "border-outline-variant focus:border-primary-container";
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}

// A label, the input passed in as children, and the error text under it
function Field({ id, label, error, wide, children }: FieldProps) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1.5 block text-label-md text-on-surface-variant">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-label-sm text-error">{error}</p> : null}
    </div>
  );
}

// The details card for one adult. All state lives in the page; this only shows it and reports changes.
export default function PassengerForm({ index, passenger, errors, onChange }: PassengerFormProps) {
  const prefix = `traveller-${index}`;

  return (
    <div className="mb-space-lg rounded-xl bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex items-center gap-3 pb-space-md">
        <span className="text-title text-on-surface">Adult {index + 1}</span>
        {index === 0 ? (
          <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-label-sm text-on-surface-variant">
            Primary passenger
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-title`} label="Title" error={errors.title}>
          <select
            id={`${prefix}-title`}
            className={`${inputClass} ${inputBorder(Boolean(errors.title))}`}
            value={passenger.title}
            onChange={(event) => onChange("title", event.target.value)}
          >
            <option value="">Select</option>
            {TITLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${prefix}-gender`} label="Gender" error={errors.gender}>
          <select
            id={`${prefix}-gender`}
            className={`${inputClass} ${inputBorder(Boolean(errors.gender))}`}
            value={passenger.gender}
            onChange={(event) => onChange("gender", event.target.value)}
          >
            <option value="">Select</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${prefix}-given`} label="Given name" error={errors.givenName}>
          <input
            id={`${prefix}-given`}
            type="text"
            autoComplete="given-name"
            placeholder="e.g. Alex"
            className={`${inputClass} ${inputBorder(Boolean(errors.givenName))}`}
            value={passenger.givenName}
            onChange={(event) => onChange("givenName", event.target.value)}
          />
        </Field>

        <Field id={`${prefix}-family`} label="Family name" error={errors.familyName}>
          <input
            id={`${prefix}-family`}
            type="text"
            autoComplete="family-name"
            placeholder="e.g. Taylor"
            className={`${inputClass} ${inputBorder(Boolean(errors.familyName))}`}
            value={passenger.familyName}
            onChange={(event) => onChange("familyName", event.target.value)}
          />
        </Field>

        <Field id={`${prefix}-dob`} label="Date of birth" error={errors.bornOn}>
          {/* A date input gives YYYY-MM-DD, the format the backend wants */}
          <input
            id={`${prefix}-dob`}
            type="date"
            max={todayString()}
            className={`${inputClass} ${inputBorder(Boolean(errors.bornOn))}`}
            value={passenger.bornOn}
            onChange={(event) => onChange("bornOn", event.target.value)}
          />
        </Field>

        <Field id={`${prefix}-phone`} label="Phone number" error={errors.phoneNumber}>
          <input
            id={`${prefix}-phone`}
            type="tel"
            autoComplete="tel"
            placeholder="+919876543210"
            className={`${inputClass} ${inputBorder(Boolean(errors.phoneNumber))}`}
            value={passenger.phoneNumber}
            onChange={(event) => onChange("phoneNumber", event.target.value)}
          />
        </Field>

        <Field
          id={`${prefix}-email`}
          label="Email address (for booking confirmation and tickets)"
          error={errors.email}
          wide
        >
          <input
            id={`${prefix}-email`}
            type="email"
            autoComplete="email"
            placeholder="alex.taylor@example.com"
            className={`${inputClass} ${inputBorder(Boolean(errors.email))}`}
            value={passenger.email}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
