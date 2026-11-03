import { useEffect, useState, type FormEvent } from "react";
import { fetchMyProfile, updateMyProfile, type UpdateProfileInput } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { toStoreUser, type ApiUser } from "../types/user";
import AuthField from "../components/auth/AuthField";
import AuthButton from "../components/auth/AuthButton";
import AuthAlert from "../components/auth/AuthAlert";
import { readApiError } from "../utils/apiError";
import { validateName, validateUserName } from "../components/auth/authRules";
import styles from "./ProfilePage.module.css";

interface ProfileErrors {
  name?: string;
  userName?: string;
  avatarUrl?: string;
}

export default function ProfilePage() {
  const setSession = useAuthStore((state) => state.setSession);

  // The store only keeps id, name and email, so the full profile (userName, avatar...) is loaded here
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bump this to run the load again (the "Try again" button)
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    // If the user leaves the page before the answer arrives, do not touch state afterwards
    let isCancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const loaded = await fetchMyProfile();
        if (isCancelled) {
          return;
        }
        setProfile(loaded);
        setName(loaded.name);
        setUserName(loaded.userName);
        setAvatarUrl(loaded.avatarUrl ?? "");
      } catch (error) {
        if (isCancelled) {
          return;
        }
        const info = readApiError(error);
        setLoadError(info.message);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [loadAttempt]);

  function handleNameChange(value: string) {
    setName(value);
    setIsSaved(false);
    setFieldErrors({ ...fieldErrors, name: undefined });
  }

  function handleUserNameChange(value: string) {
    setUserName(value);
    setIsSaved(false);
    setFieldErrors({ ...fieldErrors, userName: undefined });
  }

  function handleAvatarUrlChange(value: string) {
    setAvatarUrl(value);
    setIsSaved(false);
    setAvatarBroken(false);
    setFieldErrors({ ...fieldErrors, avatarUrl: undefined });
  }

  if (isLoading) {
    return (
      <div className={styles.div1}>
        <p role="status" className={styles.p1}>
          Loading your profile...
        </p>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className={styles.div2}>
        <AuthAlert kind="error">{loadError ?? "We could not load your profile."}</AuthAlert>
        <button
          type="button"
          onClick={() => setLoadAttempt(loadAttempt + 1)}
          className={styles.button1}
        >
          Try again
        </button>
      </div>
    );
  }

  const cleanName = name.trim();
  const cleanUserName = userName.trim();
  const cleanAvatarUrl = avatarUrl.trim();

  // Send only what changed. The backend can set an avatar but not remove one,
  // so an empty box is "no change" when there is no avatar, and an error when there is.
  const hasNameChange = cleanName !== profile.name;
  const hasUserNameChange = cleanUserName !== profile.userName;
  const hasAvatarChange = cleanAvatarUrl !== "" && cleanAvatarUrl !== (profile.avatarUrl ?? "");
  // Counted as a change too, so the button stays active and submit can explain why it fails
  const hasAvatarCleared = cleanAvatarUrl === "" && Boolean(profile.avatarUrl);
  const hasChanges = hasNameChange || hasUserNameChange || hasAvatarChange || hasAvatarCleared;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSaved(false);

    const errors: ProfileErrors = {};
    const nameProblem = validateName(cleanName);
    const userNameProblem = validateUserName(cleanUserName);
    if (nameProblem) {
      errors.name = nameProblem;
    }
    if (userNameProblem) {
      errors.userName = userNameProblem;
    }
    if (hasAvatarCleared) {
      errors.avatarUrl = "A picture can be replaced but not removed yet. Enter a new link.";
    } else if (cleanAvatarUrl !== "" && !/^https?:\/\//.test(cleanAvatarUrl)) {
      errors.avatarUrl = "Avatar URL must start with http:// or https://";
    }
    setFieldErrors(errors);
    if (errors.name || errors.userName || errors.avatarUrl) {
      return;
    }

    const changes: UpdateProfileInput = {};
    if (hasNameChange) {
      changes.name = cleanName;
    }
    if (hasUserNameChange) {
      changes.userName = cleanUserName;
    }
    if (hasAvatarChange) {
      changes.avatarUrl = cleanAvatarUrl;
    }

    setIsSaving(true);
    try {
      const updated = await updateMyProfile(changes);
      setProfile(updated);
      setName(updated.name);
      setUserName(updated.userName);
      setAvatarUrl(updated.avatarUrl ?? "");
      setAvatarBroken(false);
      setIsSaved(true);

      // Keep the top bar and other pages in step with the new name
      // Read the token now, not from the render: if this request had to refresh an expired
      // token, the render's copy is the old one and would overwrite the new one.
      const currentToken = useAuthStore.getState().accessToken;
      if (currentToken) {
        setSession(currentToken, toStoreUser(updated));
      }
    } catch (error) {
      const info = readApiError(error);

      if (info.code === "USERNAME_TAKEN") {
        setFieldErrors({ userName: info.message });
      } else {
        setFormError(info.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long"
  });
  const initial = profile.name.charAt(0).toUpperCase();
  const showAvatarImage = Boolean(profile.avatarUrl) && !avatarBroken;

  return (
    <div className={styles.div1}>
      <h1 className={styles.h11}>Your profile</h1>

      <div className={styles.div3}>
        {showAvatarImage ? (
          <img
            src={profile.avatarUrl}
            alt=""
            onError={() => setAvatarBroken(true)}
            className={styles.img1}
          />
        ) : (
          <span className={styles.span1}>
            {initial}
          </span>
        )}

        <div className={styles.div4}>
          <p className={styles.p2}>{profile.name}</p>
          <p className={styles.p3}>
            @{profile.userName} · {profile.email}
          </p>
          <p className={styles.p4}>
            <span className={`${styles.span2} material-symbols-outlined`}>
              {profile.isEmailVerified ? "verified" : "mail"}
            </span>
            <span>{profile.isEmailVerified ? "Email verified" : "Email not verified yet"}</span>
            <span>· Member since {memberSince}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className={styles.form1}>
        {formError ? <AuthAlert kind="error">{formError}</AuthAlert> : null}
        {isSaved ? <AuthAlert kind="success">Profile saved.</AuthAlert> : null}

        <AuthField
          id="name"
          label="Name"
          value={name}
          onChange={handleNameChange}
          autoComplete="name"
          error={fieldErrors.name}
          disabled={isSaving}
        />

        <AuthField
          id="userName"
          label="Username"
          value={userName}
          onChange={handleUserNameChange}
          autoComplete="username"
          error={fieldErrors.userName}
          hint="3 to 20 characters"
          disabled={isSaving}
        />

        {/* Email comes from sign-up and the backend does not let it be edited */}
        <AuthField
          id="email"
          label="Email"
          value={profile.email}
          onChange={() => undefined}
          hint="Email cannot be changed"
          disabled
        />

        <AuthField
          id="avatarUrl"
          label="Profile picture link (optional)"
          type="url"
          value={avatarUrl}
          onChange={handleAvatarUrlChange}
          placeholder="https://example.com/me.jpg"
          error={fieldErrors.avatarUrl}
          disabled={isSaving}
        />

        <AuthButton isLoading={isSaving} loadingText="Saving..." disabled={!hasChanges}>
          Save changes
        </AuthButton>
      </form>
    </div>
  );
}
