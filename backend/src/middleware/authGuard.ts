import { Request, Response, NextFunction } from "express";
import { TokenExpiredError } from "jsonwebtoken";

import { verifyAccessToken } from "../utils/jwt";

import { AppError } from "../utils/AppError";

export const authGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      throw new AppError(
        "UNAUTHORIZED",
        "Authentication token is required",
        401
      );
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError(
        "INVALID_TOKEN",
        "Invalid authentication token format",
        401
      );
    }

    const payload = verifyAccessToken(token);

    req.authUser = payload;

    next();
  } catch (error) {
    // The two errors thrown above already say what is wrong; pass them on untouched
    if (error instanceof AppError) {
      return next(error);
    }

    // The frontend needs to tell "expired" (refresh and retry) from "invalid" (log in again).
    // Both stay 401, because the frontend retries on 401.
    if (error instanceof TokenExpiredError) {
      return next(new AppError("TOKEN_EXPIRED", "Access token has expired", 401));
    }

    next(new AppError("INVALID_TOKEN", "Access token is not valid", 401));
  }
};