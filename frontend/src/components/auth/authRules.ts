// These rules mirror backend/src/validators/authValidators.ts. Keep the two in step.
// Callers pass trimmed text: the User model trims too, so " ab " would pass the
// backend validator (4 characters) and then fail in the database (2 characters).

export function validateName(name: string): string | null {
  if (!name) {
    return "Name is required";
  }
  if (name.length < 3 || name.length > 50) {
    return "Name must be between 3 and 50 characters";
  }
  return null;
}

export function validateUserName(userName: string): string | null {
  if (!userName) {
    return "Username is required";
  }
  if (userName.length < 3 || userName.length > 20) {
    return "Username must be between 3 and 20 characters";
  }
  return null;
}

// The backend uses the `validator` package, which we do not ship to the browser.
// This simple check catches typos; the server still has the final say.
export function validateEmail(email: string): string | null {
  if (!email) {
    return "Email is required";
  }
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!looksLikeEmail) {
    return "Email address is not valid";
  }
  return null;
}

// The three password rules, as separate booleans so the checklist can tick them one by one.
export interface PasswordChecks {
  longEnough: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    longEnough: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password)
  };
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  const checks = getPasswordChecks(password);
  if (!checks.longEnough) {
    return "Password must be at least 8 characters";
  }
  if (!checks.hasUppercase) {
    return "Password must contain at least one uppercase letter";
  }
  if (!checks.hasNumber) {
    return "Password must contain at least one number";
  }
  return null;
}
