import { Request, Response, NextFunction } from "express";

type Validator = (input: unknown) => string | null;

// "body" for POST/PUT payloads, "query" for GET search params (?origin=DEL&...),
// "params" for ids inside the path (/flights/:offerId)
type RequestSource = "body" | "query" | "params";

export const validateRequest =
  (validator: Validator, source: RequestSource = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const error = validator(req[source]);

    if (error) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error,
        },
      });
    }

    next();
  };