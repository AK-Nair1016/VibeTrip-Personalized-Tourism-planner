import type { User } from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";
import { toStoreUser, type ApiUser } from "../types/user";

// Asks the backend for a new access token using the refresh cookie.
// "/auth/refresh" is on the interceptor's skip list, so a 401 here is passed straight to the caller.
export async function refreshAccessToken(): Promise<string> {
  const response = await api.post<ApiResponse<{ accessToken: string }>>("/auth/refresh");
  return response.data.data.accessToken;
}

// Tells the backend to clear the refresh cookie. We have no use for the reply.
export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout");
}

// The backend wraps the user as data: { user }, and calls the id `_id`.
// Convert here so session restore after a reload gives the same `id` as a fresh login.
export async function fetchCurrentUser(): Promise<User> {
  const response = await api.get<ApiResponse<{ user: ApiUser }>>("/users/me");
  return toStoreUser(response.data.data.user);
}

// ---- Pages: login, signup, password reset, email verification, profile ----

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  userName: string;
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  userName?: string;
  name?: string;
  avatarUrl?: string;
}

// Login and signup both answer with the user plus a short-lived access token.
// The refresh token travels in an httpOnly cookie, so JavaScript never sees it.
export interface AuthResult {
  user: ApiUser;
  accessToken: string;
}

export async function loginRequest(input: LoginInput): Promise<AuthResult> {
  const response = await api.post<ApiResponse<AuthResult>>("/auth/login", input);
  return response.data.data;
}

export async function signupRequest(input: SignupInput): Promise<AuthResult> {
  const response = await api.post<ApiResponse<AuthResult>>("/auth/signup", input);
  return response.data.data;
}

// The backend answers 200 whether or not the email exists, so there is nothing to return.
export async function forgotPasswordRequest(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPasswordRequest(token: string, password: string): Promise<void> {
  await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password });
}

export async function verifyEmailRequest(token: string): Promise<void> {
  await api.get(`/auth/verify-email/${encodeURIComponent(token)}`);
}

// Same endpoint as fetchCurrentUser, but typed with the fields the API really returns.
export async function fetchMyProfile(): Promise<ApiUser> {
  const response = await api.get<ApiResponse<{ user: ApiUser }>>("/users/me");
  return response.data.data.user;
}

export async function updateMyProfile(input: UpdateProfileInput): Promise<ApiUser> {
  const response = await api.put<ApiResponse<{ user: ApiUser }>>("/users/me", input);
  return response.data.data.user;
}
