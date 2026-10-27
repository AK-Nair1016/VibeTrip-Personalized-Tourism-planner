import type { CookieOptions } from "express";
import { env } from "../config/env";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// One place for the refresh cookie settings, so setting and clearing it can never disagree.
// In production the frontend (Vercel) and the API (Render) are on different sites, so the browser only
// sends the cookie if it is `secure` (https) and `sameSite: "none"`. Locally "lax" over http works.
export const refreshCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: SEVEN_DAYS_MS,
  };
};
