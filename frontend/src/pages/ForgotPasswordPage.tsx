import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "../api/auth";
import AuthShell from "../components/auth/AuthShell";
import AuthField from "../components/auth/AuthField";
import AuthButton from "../components/auth/AuthButton";
import AuthAlert from "../components/auth/AuthAlert";
import { readApiError } from "../utils/apiError";
import { validateEmail } from "../components/auth/authRules";
import styles from "./ForgotPasswordPage.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleEmailChange(value: string) {
    setEmail(value);
    setEmailError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();
    const problem = validateEmail(cleanEmail);
    setEmailError(problem);
    if (problem) {
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordRequest(cleanEmail);
      setIsSent(true);
    } catch (error) {
      const info = readApiError(error);
      setFormError(info.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we will send you a link to choose a new one.">
      <form onSubmit={handleSubmit} noValidate className={styles.form1}>
        {formError ? <AuthAlert kind="error">{formError}</AuthAlert> : null}

        {/* The backend answers 200 whether or not the email has an account, so the message never says which */}
        {isSent ? (
          <AuthAlert kind="success">If that email exists, we sent a link to reset your password. It works for 15 minutes.</AuthAlert>
        ) : null}

        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="alex@example.com"
          autoComplete="email"
          error={emailError}
          disabled={isSubmitting}
        />

        <AuthButton isLoading={isSubmitting} loadingText="Sending...">
          {isSent ? "Send again" : "Send reset link"}
        </AuthButton>

        <div className={styles.div1}>
          <Link to="/login" className={styles.link1}>
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
