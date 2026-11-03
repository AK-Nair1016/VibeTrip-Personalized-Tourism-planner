import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { loginRequest } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { toStoreUser } from "../types/user";
import AuthShell from "../components/auth/AuthShell";
import AuthField from "../components/auth/AuthField";
import PasswordField from "../components/auth/PasswordField";
import AuthButton from "../components/auth/AuthButton";
import AuthAlert from "../components/auth/AuthAlert";
import { readApiError } from "../utils/apiError";
import { getRedirectTarget } from "../components/auth/redirectTarget";
import styles from "./LoginPage.module.css";

interface LoginErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Where to go after login: the page PrivateRoute bounced the visitor from, or home
  const redirectTarget = getRedirectTarget(location.state);

  // Already logged in (or just logged in: setSession below flips this): leave the login page.
  // One redirect rule for both cases keeps the submit handler short.
  if (accessToken) {
    return <Navigate to={redirectTarget} replace />;
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    setFieldErrors({ ...fieldErrors, email: undefined });
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setFieldErrors({ ...fieldErrors, password: undefined });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();

    // The login rule is only "both are filled in"; the server decides if they match
    const errors: LoginErrors = {};
    if (!cleanEmail) {
      errors.email = "Email is required";
    }
    if (!password) {
      errors.password = "Password is required";
    }
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginRequest({ email: cleanEmail, password });
      setSession(result.accessToken, toStoreUser(result.user));
    } catch (error) {
      const info = readApiError(error);

      if (info.code === "INVALID_CREDENTIALS") {
        // The mock's wording; the server's own text is the plainer "Invalid email or password"
        setFormError("That email and password don't match. Try again.");
      } else {
        setFormError(info.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your trips."
      panelTitle="Paris, 4 days"
      panelText="Land Tuesday. Louvre Wednesday."
    >
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {formError ? <AuthAlert kind="error">{formError}</AuthAlert> : null}

        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="alex@example.com"
          autoComplete="email"
          error={fieldErrors.email}
          disabled={isSubmitting}
        />

        <PasswordField
          value={password}
          onChange={handlePasswordChange}
          error={fieldErrors.password}
          disabled={isSubmitting}
          autoComplete="current-password"
        />

        <AuthButton isLoading={isSubmitting} loadingText="Signing in...">
          Continue
        </AuthButton>

        <div className={styles.forgotWrap}>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>New here?</span>
        </div>

        <Link to="/signup" state={location.state} className={styles.signupLink}>
          Create an account
        </Link>
      </form>
    </AuthShell>
  );
}
