import { Types } from "mongoose";
import type { HotelBookingSnapshot, HotelReview } from "@vibetrip/shared-types";
import { Booking } from "../models/Booking";
import { Hotel } from "../models/Hotel";
import { Review } from "../models/Review";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { isDuplicateKeyError } from "../utils/dbErrors";

export interface CreateReviewData {
  userId: string;
  bookingId: string;
  rating: number;
  text: string;
}

export interface DeleteReviewData {
  userId: string;
  reviewId: string;
}

const MAX_REVIEWS_SHOWN = 50;

type ReviewDoc = {
  _id: { toString(): string };
  authorName: string;
  rating: number;
  text: string;
  createdAt: Date;
};

const toHotelReview = (review: ReviewDoc): HotelReview => {
  return {
    id: review._id.toString(),
    authorName: review.authorName,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt.toISOString(),
  };
};

// Recomputes Hotel.guestRating and Hotel.reviewCount from the reviews that exist now.
// Called after every create and delete, because a save hook would miss deletes.
export const recomputeHotelRating = async (hotelId: string): Promise<void> => {
  const stats = await Review.aggregate([
    // aggregate() does not turn text into an ObjectId the way find() does, so it is done here
    { $match: { hotelId: new Types.ObjectId(hotelId) } },
    { $group: { _id: "$hotelId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  // The last review was deleted: no group comes back, so the hotel goes back to "no rating yet"
  let guestRating = 0;
  let reviewCount = 0;

  if (stats[0]) {
    // One decimal is what the page shows, e.g. 4.3
    guestRating = Math.round(stats[0].average * 10) / 10;
    reviewCount = stats[0].count;
  }

  await Hotel.findByIdAndUpdate(hotelId, { guestRating, reviewCount });
};

// Newest first, at most 50.
export const listHotelReviews = async (hotelId: string): Promise<HotelReview[]> => {
  const hotelExists = await Hotel.exists({ _id: hotelId });
  if (!hotelExists) {
    throw new AppError("HOTEL_NOT_FOUND", "Hotel not found", 404);
  }

  const reviews = await Review.find({ hotelId }).sort({ createdAt: -1 }).limit(MAX_REVIEWS_SHOWN).lean();

  return reviews.map(toHotelReview);
};

// Allowed once the booking is a confirmed hotel booking owned by this user, one review per booking.
export const createReview = async (data: CreateReviewData): Promise<HotelReview> => {
  const { userId, bookingId, rating, text } = data;

  // Query by BOTH ids: someone else's booking looks the same as a missing one
  const booking = await Booking.findOne({ _id: bookingId, userId }).lean();

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  if (booking.type !== "hotel" || booking.status !== "confirmed") {
    throw new AppError("NOT_REVIEWABLE", "You can review a hotel once your booking is confirmed", 409);
  }

  const user = await User.findById(userId).select("name").lean();

  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  const snapshot = booking.snapshot as HotelBookingSnapshot;

  let review;
  try {
    review = await Review.create({
      hotelId: snapshot.hotelId,
      userId,
      bookingId,
      authorName: user.name,
      rating,
      text: text.trim(),
    });
  } catch (error) {
    // The unique bookingId index refused a second review for the same booking
    if (isDuplicateKeyError(error)) {
      throw new AppError("REVIEW_EXISTS", "You already reviewed this booking", 409);
    }
    throw error;
  }

  await recomputeHotelRating(snapshot.hotelId);

  return toHotelReview(review);
};

// Own review only. Someone else's review looks like a missing one.
export const deleteReview = async (data: DeleteReviewData): Promise<void> => {
  const { userId, reviewId } = data;

  const deleted = await Review.findOneAndDelete({ _id: reviewId, userId });

  if (!deleted) {
    throw new AppError("REVIEW_NOT_FOUND", "Review not found", 404);
  }

  await recomputeHotelRating(deleted.hotelId.toString());
};
