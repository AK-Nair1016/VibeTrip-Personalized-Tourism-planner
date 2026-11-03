import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { resetPasswordRequest } from "../api/auth";
import AuthShell from "../components/auth/AuthShell";
import PasswordField from "../components/auth/PasswordField";
import PasswordRules from "../components/auth/PasswordRules";
import AuthButton from "../components/auth/AuthButton";
import AuthAlert from "../components/auth/AuthAlert";
import { readApiError } from "../utils/apiError";
import { validatePassword } from "../components/auth/authRules";
import styles from "./ResetPasswordPage.module.css";

export default function ResetPasswordPage() {
  // The raw token from the emailed link: /reset-password/:token
  const { token } = useParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handlePasswordChange(value: string) {
    setPassword(value);
    setPasswordError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError("This reset link is not valid. Ask for a new one.");
      return;
    }

    const problem = validatePassword(password);
    setPasswordError(problem);
    if (problem) {
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordRequest(token, password);
      setIsDone(true);
    } catch (error) {
      const info = readApiError(error);
      setFormError(info.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // After success there is nothing left to fill in, only the way back to login
  if (isDone) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Link
          to="/login"
          className={styles.link1}
        >
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you have not used before.">
      <form onSubmit={handleSubmit} noValidate className={styles.form1}>
        {formError ? (
          <AuthAlert kind="error">
            {formError}{" "}
            <Link to="/forgot-password" className={styles.link2}>
              Get a new link
            </Link>
          </AuthAlert>
        ) : null}

        <PasswordField
          label="New password"
          value={password}
          onChange={handlePasswordChange}
          error={passwordError}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <PasswordRules password={password} />

        <AuthButton isLoading={isSubmitting} loadingText="Saving...">
          Save new password
        </AuthButton>
      </form>
    </AuthShell>
  );
}
