import { Request, Response, NextFunction } from "express";

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
    next(
      new AppError(
        "UNAUTHORIZED",
        "Invalid or expired authentication token",
        401
      )
    );
  }
};