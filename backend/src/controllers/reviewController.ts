import type { Request, Response } from "express";
import {
  createReview as createReviewService,
  deleteReview as deleteReviewService,
} from "../services/reviewService";
import { catchAsync } from "../utils/catchAsync";

export const createReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const { bookingId, rating, text } = req.body;

  const review = await createReviewService({ userId, bookingId, rating, text });

  res.status(201).json({
    success: true,
    message: "Review added",
    data: review,
  });
});

export const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const id = req.params.id as string;

  await deleteReviewService({ userId, reviewId: id });

  res.status(200).json({
    success: true,
    message: "Review deleted",
    data: null,
  });
});
