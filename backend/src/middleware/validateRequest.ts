import { Request, Response, NextFunction } from "express";

type Validator = (body: unknown) => string | null;

export const validateRequest =
  (validator: Validator) =>
  (req: Request, res: Response, next: NextFunction) => {
    const error = validator(req.body);

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