import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { signupRequest } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { toStoreUser } from "../types/user";
import AuthShell from "../components/auth/AuthShell";
import AuthField from "../components/auth/AuthField";
import PasswordField from "../components/auth/PasswordField";
import PasswordRules from "../components/auth/PasswordRules";
import AuthButton from "../components/auth/AuthButton";
import AuthAlert from "../components/auth/AuthAlert";
import { readApiError } from "../utils/apiError";
import { getRedirectTarget } from "../components/auth/redirectTarget";
import { validateName, validateUserName, validateEmail, validatePassword } from "../components/auth/authRules";
import styles from "./SignupPage.module.css";

interface SignupErrors {
  name?: string;
  userName?: string;
  email?: string;
  password?: string;
}

export default function SignupPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const location = useLocation();

  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signup also logs the user in (the backend answers with a token), so a successful
  // signup flips accessToken and this redirect takes the user onward.
  if (accessToken) {
    return <Navigate to={getRedirectTarget(location.state)} replace />;
  }

  function handleNameChange(value: string) {
    setName(value);
    setFieldErrors({ ...fieldErrors, name: undefined });
  }

  function handleUserNameChange(value: string) {
    setUserName(value);
    setFieldErrors({ ...fieldErrors, userName: undefined });
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

    // Trim first: the database trims too, so the length rules must see the trimmed text
    const cleanName = name.trim();
    const cleanUserName = userName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const errors: SignupErrors = {};
    const nameProblem = validateName(cleanName);
    const userNameProblem = validateUserName(cleanUserName);
    const emailProblem = validateEmail(cleanEmail);
    const passwordProblem = validatePassword(password);
    if (nameProblem) {
      errors.name = nameProblem;
    }
    if (userNameProblem) {
      errors.userName = userNameProblem;
    }
    if (emailProblem) {
      errors.email = emailProblem;
    }
    if (passwordProblem) {
      errors.password = passwordProblem;
    }
    setFieldErrors(errors);
    if (nameProblem || userNameProblem || emailProblem || passwordProblem) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signupRequest({
        userName: cleanUserName,
        name: cleanName,
        email: cleanEmail,
        password
      });
      setSession(result.accessToken, toStoreUser(result.user));
    } catch (error) {
      const info = readApiError(error);

      // Put a "taken" message next to the field the user has to change
      if (info.code === "EMAIL_TAKEN") {
        setFieldErrors({ email: info.message });
      } else if (info.code === "USERNAME_TAKEN") {
        setFieldErrors({ userName: info.message });
      } else {
        setFormError(info.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create an account" subtitle="Takes under a minute.">
      <form onSubmit={handleSubmit} noValidate className={styles.form1}>
        {formError ? <AuthAlert kind="error">{formError}</AuthAlert> : null}

        <div className={styles.div1}>
          <AuthField
            id="name"
            label="Name"
            value={name}
            onChange={handleNameChange}
            placeholder="Alex Taylor"
            autoComplete="name"
            error={fieldErrors.name}
            disabled={isSubmitting}
          />
          <AuthField
            id="userName"
            label="Username"
            value={userName}
            onChange={handleUserNameChange}
            placeholder="alextaylor"
            autoComplete="username"
            error={fieldErrors.userName}
            hint="3 to 20 characters"
            disabled={isSubmitting}
          />
        </div>

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
          autoComplete="new-password"
        />

        <PasswordRules password={password} />

        <AuthButton isLoading={isSubmitting} loadingText="Creating account...">
          Create account
        </AuthButton>

        <div className={styles.div2}>
          <p className={styles.p1}>
            Have an account?{" "}
            <Link to="/login" state={location.state} className={styles.link1}>
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
