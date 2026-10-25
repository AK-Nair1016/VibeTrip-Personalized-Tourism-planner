import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

type JwtExpiresIn = SignOptions["expiresIn"];

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key]?.trim() || fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};
const getJwtExpiresIn = (
  key: string,
  fallback: JwtExpiresIn
): JwtExpiresIn => {
  return getEnv(key, String(fallback)) as JwtExpiresIn;
};

export const env = {
  // JWT
  JWT_ACCESS_SECRET: getEnv(
    "JWT_ACCESS_SECRET",
    "dev-access-secret"
  ),

  JWT_ACCESS_EXPIRES: getJwtExpiresIn(
    "JWT_ACCESS_EXPIRES",
    "15m"
  ),

  JWT_REFRESH_SECRET: getEnv(
    "JWT_REFRESH_SECRET",
    "dev-refresh-secret"
  ),

  JWT_REFRESH_EXPIRES: getJwtExpiresIn(
    "JWT_REFRESH_EXPIRES",
    "7d"
  ),

  // Google OAuth
  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),

  GOOGLE_CALLBACK_URL: getEnv(
    "GOOGLE_CALLBACK_URL",
    "http://localhost:5000/api/auth/google/callback"
  ),

  // Duffel (test mode key starts with duffel_test_)
  DUFFEL_API_KEY: getEnv("DUFFEL_API_KEY"),

  // Stripe (test mode key starts with sk_test_)
  STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
  // Signing secret for the webhook (starts with whsec_); used to verify that Stripe sent the event
  STRIPE_WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET"),

  // Currency conversion: margin added on top of the exchange rate, in percent
  FX_MARGIN_PERCENT: Number(getEnv("FX_MARGIN_PERCENT", "2")),
  // Public rates API (no key); the base currency is appended as /{BASE}
  FX_RATES_URL: getEnv("FX_RATES_URL", "https://open.er-api.com/v6/latest"),
};