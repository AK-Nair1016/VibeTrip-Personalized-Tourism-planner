import type { SignOptions } from "jsonwebtoken";

type JwtExpiresIn = SignOptions["expiresIn"];

const getEnv = (key: string, fallback?: string) => {
  const value = process.env[key] || fallback;

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
};

const getJwtExpiresIn = (key: string, fallback: JwtExpiresIn): JwtExpiresIn =>
  getEnv(key, String(fallback)) as JwtExpiresIn;

export const env = {
  JWT_ACCESS_SECRET: getEnv("JWT_ACCESS_SECRET", "dev-access-secret"),
  JWT_ACCESS_EXPIRES: getJwtExpiresIn("JWT_ACCESS_EXPIRES", "15m"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret"),
  JWT_REFRESH_EXPIRES: getJwtExpiresIn("JWT_REFRESH_EXPIRES", "7d")
};
