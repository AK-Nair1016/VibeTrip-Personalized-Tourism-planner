import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { verifyEmailRequest } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import AuthShell from "../components/auth/AuthShell";
import AuthAlert from "../components/auth/AuthAlert";
import { readApiError } from "../utils/apiError";
import styles from "./VerifyEmailPage.module.css";

type VerifyStatus = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // React 19 StrictMode runs effects twice in development. A verification token works only
  // once (the backend clears it), so the second call would report a false failure.
  // A ref survives that double run, so it can remember we already sent the request.
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) {
      return;
    }
    hasRequested.current = true;

    async function verify() {
      if (!token) {
        setErrorMessage("This verification link is not valid.");
        setStatus("error");
        return;
      }

      try {
        await verifyEmailRequest(token);
        setStatus("success");
      } catch (error) {
        const info = readApiError(error);
        setErrorMessage(info.message);
        setStatus("error");
      }
    }

    verify();
  }, [token]);

  if (status === "loading") {
    return (
      <AuthShell title="Verifying your email" subtitle="One moment...">
        <p role="status" className={styles.p1}>
          Checking your link.
        </p>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell title="Email verified" subtitle="Thanks, your address is confirmed.">
        <Link to={accessToken ? "/profile" : "/login"} className={styles.link}>
          {accessToken ? "Go to my profile" : "Go to sign in"}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="We could not verify your email">
      <div className={styles.div1}>
        <AuthAlert kind="error">{errorMessage}</AuthAlert>
        <Link to={accessToken ? "/profile" : "/login"} className={styles.link}>
          {accessToken ? "Go to my profile" : "Go to sign in"}
        </Link>
      </div>
    </AuthShell>
  );
}
