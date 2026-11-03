import { useState } from "react";
import AuthField from "./AuthField";

interface PasswordFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  // "current-password" on login, "new-password" when choosing one
  autoComplete?: string;
}

// A password box with the mock's Show/Hide button.
export default function PasswordField({
  id = "password",
  label = "Password",
  value,
  onChange,
  error,
  disabled,
  autoComplete = "current-password"
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  function toggleVisible() {
    setIsVisible(!isVisible);
  }

  const toggleButton = (
    <button
      type="button"
      onClick={toggleVisible}
      className="pt-3 font-label-md text-label-md text-on-surface underline hover:text-primary-container"
    >
      {isVisible ? "Hide" : "Show"}
    </button>
  );

  return (
    <AuthField
      id={id}
      label={label}
      type={isVisible ? "text" : "password"}
      value={value}
      onChange={onChange}
      placeholder="Your password"
      autoComplete={autoComplete}
      error={error}
      disabled={disabled}
      trailing={toggleButton}
    />
  );
}
