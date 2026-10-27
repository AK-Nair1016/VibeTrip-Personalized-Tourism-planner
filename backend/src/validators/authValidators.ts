type SignupBody = { userName?: unknown; name?: unknown; email?: unknown; password?: unknown };
type LoginBody = { email?: unknown; password?: unknown };
type ForgotPasswordBody = { email?: unknown };
type ResetPasswordBody = { password?: unknown };

export const validateSignup = (body: unknown): string | null => {
  // Express 5 leaves req.body undefined when the client sends no JSON
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const { userName, name, email, password } = body as SignupBody;

  if (!userName) {
    return "Username is required";
  }

  if (!name) {
    return "Name is required";
  }

  if (!email) {
    return "Email is required";
  }

  if (!password) {
    return "Password is required";
  }

  // A client can send a number or an object instead of text, and .length on those gives no error
  if (
    typeof userName !== "string" ||
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return "Username, name, email and password must be text";
  }

  if (userName.length < 3 || userName.length > 20) {
    return "Username must be between 3 and 20 characters";
  }

  if (name.length < 3 || name.length > 50) {
    return "Name must be between 3 and 50 characters";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  return null;
};

export const validateLogin = (body: unknown): string | null => {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const { email, password } = body as LoginBody;

  if (!email) {
    return "Email is required";
  }

  if (!password) {
    return "Password is required";
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return "Email and password must be text";
  }

  return null;
};

export const validateForgetPassword = (body: unknown): string | null => {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const { email } = body as ForgotPasswordBody;

  if (!email) {
    return "Email is required";
  }

  if (typeof email !== "string") {
    return "Email must be text";
  }

  return null;
};

export const validateResetPassword = (body: unknown): string | null => {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const { password } = body as ResetPasswordBody;

  if (!password) {
    return "Password is required";
  }

  if (typeof password !== "string") {
    return "Password must be text";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  return null;
};